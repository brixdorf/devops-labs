// Lab session lifecycle: one lab at a time, launch, terminals, submissions,
// idle timeout and stop.
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_LABEL, PROJECT_VALUE, ROLE_LABEL, SESSION_LABEL, labImageVars } from './config.js';
import { labSetupFiles } from './labs.js';
import { parseCheckerOutput, summarizeResult } from './checker.js';
import { cleanupSessions } from './cleanup.js';
import { CREDENTIALS, ENVIRONMENTS, LAB_USER, SUDO_PASSWORD, forwardsFile, labTcpCommand, servicesForLab } from './services.js';
import { AbortError, HttpError, randomHex, waitFor } from './util.js';

const LOG_LIMIT = 1024 * 1024;
const PROGRESS_LIMIT = 200;

export class SessionManager extends EventEmitter {
  constructor({ engine, catalog, images, config, labLibDir, logger = console }) {
    super();
    this.engine = engine;
    this.catalog = catalog;
    this.images = images;
    this.config = config;
    this.labLibDir = labLibDir;
    this.logger = logger;
    this.session = null;
    this.launchSeq = 0;
    this.idleTimer = null;
    this.stopping = null;
  }

  // Public view of the current session.
  view() {
    const s = this.session;
    if (!s) return null;
    return {
      id: s.id,
      labId: s.lab.id,
      state: s.state,
      hostname: s.hostname,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
      idleTimeoutMs: this.config.idleTimeoutMs,
      progress: s.progress.slice(-40),
      error: s.error || null,
      services: s.ui,
      submitting: Boolean(s.submitting),
    };
  }

  emitSession() {
    this.emit('event', { type: 'session', session: this.view() });
  }

  progress(session, line) {
    session.progress.push(line);
    if (session.progress.length > PROGRESS_LIMIT) session.progress.splice(0, session.progress.length - PROGRESS_LIMIT);
    this.emit('event', { type: 'progress', sessionId: session.id, line });
  }

  // Starts a lab. Any previous session is destroyed first.
  async launch(labId) {
    const lab = this.catalog.labs.get(labId);
    if (!lab) throw new HttpError(404, `Unknown lab "${labId}"`);
    if (this.session) await this.stop('replaced');
    const controller = new AbortController();
    const session = {
      id: randomHex(10),
      seq: ++this.launchSeq,
      lab,
      env: ENVIRONMENTS[lab.environment],
      state: 'launching',
      hostname: randomHex(12),
      startedAt: Date.now(),
      expiresAt: null,
      lastActivity: Date.now(),
      progress: [],
      containers: {},
      volumes: [],
      network: null,
      terminals: new Map(),
      log: { startedAt: new Date().toISOString(), data: '', lastTab: null },
      controller,
      state_: {},
      ui: [],
      context: null,
      submitting: false,
    };
    this.session = session;
    this.emitSession();
    session.ready = this.runLaunch(session).catch((err) => {
      if (err instanceof AbortError || controller.signal.aborted) {
        // Remove anything created after the stop request arrived.
        return this.teardown(session).catch(() => {});
      }
      this.logger.error(`Launch of ${lab.id} failed: ${err.stack || err.message}`);
      session.state = 'failed';
      session.error = err.message;
      this.progress(session, `Launch failed: ${err.message}`);
      this.emitSession();
      this.teardown(session).catch(() => {});
    });
    return this.view();
  }

  checkAborted(session) {
    if (session.controller.signal.aborted || this.session !== session) throw new AbortError();
  }

  sessionHelpers(session) {
    const mgr = this;
    return {
      signal: session.controller.signal,
      addons: session.lab.addons,
      state: session.state_,
      progress: (line) => mgr.progress(session, line),
      volumeName: (suffix) => `devops-labs-${session.id}-${suffix}`,
      execIn: (svc, cmd, opts = {}) => mgr.engine.exec(session.containers[svc], { cmd, ...opts }),
      execLab: (cmd, opts = {}) => mgr.engine.exec(session.containers.lab, { cmd, ...opts }),
      labTcp: (host, port) =>
        waitFor(async () => (await mgr.engine.exec(session.containers.lab, { cmd: labTcpCommand(host, port), timeoutMs: 5000 })).exitCode === 0, {
          timeoutMs: 180000,
          intervalMs: 1000,
          description: `${host}:${port}`,
          signal: session.controller.signal,
        }),
      putLabFile: async (dir, name, content, { uid = 0, gid = 0, mode = 0o644 } = {}) => {
        await mgr.engine.exec(session.containers.lab, { cmd: ['install', '-d', '-o', String(uid), '-g', String(gid), dir] });
        await mgr.engine.putFiles(session.containers.lab, dir, [{ name, content, mode, uid, gid }]);
      },
    };
  }

  labels(session, role) {
    return { [PROJECT_LABEL]: PROJECT_VALUE, [SESSION_LABEL]: session.id, [ROLE_LABEL]: role };
  }

  async runLaunch(session) {
    const { lab, env } = session;
    const services = servicesForLab(lab, this.config);
    const helpers = this.sessionHelpers(session);
    const say = (line) => this.progress(session, line);

    // 1. Images, built the first time they are needed.
    say(`Preparing the ${lab.environment} environment`);
    const recipes = [env.recipe, ...services.filter((s) => s.recipe).map((s) => s.recipe)];
    const tags = {};
    for (const recipe of [...new Set(recipes)]) {
      this.checkAborted(session);
      if (!(await this.images.isReady(recipe))) say('Preparing environment, first time only');
      tags[recipe] = await this.images.ensure(recipe, say);
    }
    this.checkAborted(session);

    // 2. Network and volumes.
    say('Creating the lab network');
    session.network = `devops-labs-${session.id}-net`;
    await this.engine.createNetwork(session.network, this.labels(session, 'network'));
    const volumeNames = new Set();
    for (const svc of services) for (const v of svc.volumes || []) volumeNames.add(helpers.volumeName(v));
    if (env.dockerVolume) volumeNames.add(helpers.volumeName('docker'));
    for (const name of volumeNames) {
      await this.engine.createVolume(name, this.labels(session, 'volume'));
      session.volumes.push(name);
    }
    for (const svc of services) {
      if (svc.persistentVolume && !(await this.engine.volumeExists(svc.persistentVolume))) {
        await this.engine.createVolume(svc.persistentVolume, { [PROJECT_LABEL]: PROJECT_VALUE, 'org.devopslabs.persist': 'cache' });
      }
    }
    this.checkAborted(session);

    // 3. Services that do not depend on others.
    const later = services.filter((s) => s.after || s.inCluster);
    const first = services.filter((s) => !later.includes(s));
    for (const svc of first) {
      say(`Starting ${svc.name}`);
      await this.startService(session, svc, tags[svc.recipe], helpers);
    }
    this.checkAborted(session);

    // 4. The lab container itself.
    say('Starting the lab container');
    const forwards = [];
    for (const svc of services) {
      if (svc.forward) forwards.push(svc.forward);
      if (svc.ui) session.ui.push({ name: svc.name, label: svc.ui.label, port: svc.ui.port, path: svc.ui.path });
    }
    await this.startLabContainer(session, tags[env.recipe], services, forwards);
    await waitFor(async () => (await this.engine.exec(session.containers.lab, { cmd: ['test', '-f', '/run/devops-labs/ready'], timeoutMs: 5000 })).exitCode === 0, {
      timeoutMs: 120000,
      intervalMs: 500,
      description: 'the lab container',
      signal: session.controller.signal,
    });
    if (lab.environment === 'docker') {
      say('Starting the Docker engine inside the lab');
      await waitFor(async () => (await this.engine.exec(session.containers.lab, { cmd: ['docker', 'info'], timeoutMs: 10000 })).exitCode === 0, {
        timeoutMs: 120000,
        intervalMs: 1000,
        description: 'the Docker engine',
        signal: session.controller.signal,
      });
    }

    // 5. Wait for services, then start the ones that depend on others.
    await Promise.all(first.filter((s) => s.ready).map((s) => s.ready(helpers)));
    this.checkAborted(session);
    for (const svc of later) {
      if (!svc.inCluster) {
        say(`Starting ${svc.name}`);
        await this.startService(session, svc, tags[svc.recipe], helpers);
      }
      if (svc.ready) await svc.ready(helpers);
      this.checkAborted(session);
    }

    // 6. Lab setup script.
    say('Setting up the lab');
    await this.runSetup(session);
    this.checkAborted(session);

    session.state = 'running';
    session.lastActivity = Date.now();
    session.expiresAt = session.lastActivity + this.config.idleTimeoutMs;
    say('Lab is ready');
    this.startIdleTimer(session);
    this.emitSession();
  }

  async startService(session, svc, tag, helpers) {
    const spec = svc.spec(helpers);
    const hostConfig = spec.HostConfig || {};
    const name = `devops-labs-${session.id}-${svc.name}`;
    const id = await this.engine.createContainer({
      name,
      Image: tag,
      Hostname: svc.alias,
      Labels: this.labels(session, svc.name),
      Env: spec.Env,
      Cmd: spec.Cmd,
      ExposedPorts: spec.ExposedPorts,
      HostConfig: { ...hostConfig, NetworkMode: session.network, RestartPolicy: { Name: 'no' } },
      NetworkingConfig: { EndpointsConfig: { [session.network]: { Aliases: [svc.alias] } } },
    });
    session.containers[svc.name] = id;
    if (svc.forwards?.length) {
      await this.engine.putFiles(id, '/etc/devops-labs', [{ name: 'forwards', content: forwardsFile(svc.forwards) }]);
    }
    if (svc.custom?.files) {
      const files = readTree(path.join(session.lab.dir, svc.custom.files));
      await this.engine.putFiles(id, '/', files.map((f) => ({ ...f, name: `srv/${f.name}` })));
    }
    await this.engine.startContainer(id);
  }

  async startLabContainer(session, tag, services, forwards) {
    const env = session.env;
    const mounts = [];
    if (env.dockerVolume) mounts.push({ Type: 'volume', Source: `devops-labs-${session.id}-docker`, Target: '/var/lib/docker' });
    for (const svc of services) {
      for (const m of svc.labMounts || []) mounts.push({ Type: 'volume', Source: `devops-labs-${session.id}-${m.volume}`, Target: m.target });
    }
    const hostConfig = {
      NetworkMode: session.network,
      Init: !env.systemd,
      Privileged: Boolean(env.privileged),
      Mounts: mounts,
      RestartPolicy: { Name: 'no' },
    };
    if (env.systemd) {
      hostConfig.CgroupnsMode = 'private';
      hostConfig.Tmpfs = { '/run': 'rw,exec', '/run/lock': 'rw', '/tmp': 'rw,exec' };
    }
    const id = await this.engine.createContainer({
      name: `devops-labs-${session.id}-lab`,
      Image: tag,
      Hostname: session.hostname,
      Labels: this.labels(session, 'lab'),
      Env: ['LANG=C.UTF-8', 'TERM=xterm-256color'],
      HostConfig: hostConfig,
      NetworkingConfig: { EndpointsConfig: { [session.network]: { Aliases: ['lab'] } } },
    });
    session.containers.lab = id;
    await this.engine.putFiles(id, '/etc/devops-labs', [
      { name: 'forwards', content: forwardsFile(forwards) },
      { name: 'lab.env', content: this.labEnv(session).join('\n') + '\n', mode: 0o600 },
    ]);
    await this.engine.startContainer(id);
  }

  // Environment variables passed to setup, checker and solution scripts.
  labEnv(session) {
    const p = this.config.hostPorts;
    return [
      `LAB_ID=${session.lab.id}`,
      `LAB_SESSION=${session.id}`,
      `SUDO_PASSWORD=${SUDO_PASSWORD}`,
      `GITEA_URL=http://localhost:${p.gitea}`,
      `GITEA_INTERNAL_URL=http://gitea:3000`,
      `GITEA_USER=${CREDENTIALS.gitea.user}`,
      `GITEA_PASSWORD=${CREDENTIALS.gitea.password}`,
      `GRAFANA_URL=http://localhost:${p.grafana}`,
      `GRAFANA_USER=${CREDENTIALS.grafana.user}`,
      `GRAFANA_PASSWORD=${CREDENTIALS.grafana.password}`,
      `PROMETHEUS_URL=http://localhost:${p.prometheus}`,
      `ARGOCD_URL=http://localhost:${p.argocd}`,
      `ARGOCD_USER=${CREDENTIALS.argocd.user}`,
      `ARGOCD_PASSWORD=${CREDENTIALS.argocd.password}`,
      `REGISTRY_USER=${CREDENTIALS.registry.user}`,
      `REGISTRY_PASSWORD=${CREDENTIALS.registry.password}`,
      ...Object.entries(labImageVars(this.config.versions)).map(([k, v]) => `${k}=${v}`),
    ];
  }

  async runSetup(session) {
    const id = session.containers.lab;
    const dir = `/tmp/.lab-setup-${randomHex(8)}`;
    await this.engine.exec(id, { cmd: ['install', '-d', '-m', '700', dir] });
    await this.engine.putFiles(id, dir, labSetupFiles(session.lab));
    const result = await this.engine.exec(id, {
      cmd: ['bash', `${dir}/setup.sh`],
      user: 'root',
      env: [...this.labEnv(session), `LAB_DIR=${dir}`, `LAB_CONTEXT_FILE=${dir}/context.json`],
      workdir: dir,
      timeoutMs: session.lab.timeouts.setup * 1000,
    });
    const ctx = await this.engine.exec(id, { cmd: ['cat', `${dir}/context.json`] });
    if (ctx.exitCode === 0 && ctx.stdout.trim()) session.context = ctx.stdout;
    await this.engine.exec(id, { cmd: ['rm', '-rf', dir] });
    if (result.exitCode !== 0) {
      const tail = `${result.stdout}\n${result.stderr}`.trim().split('\n').slice(-15).join('\n');
      this.logger.error(`Setup of ${session.lab.id} failed:\n${tail}`);
      throw new Error(`Lab setup failed (exit ${result.exitCode}). ${tail.split('\n').slice(-3).join(' ')}`);
    }
  }

  requireRunning() {
    const s = this.session;
    if (!s) throw new HttpError(409, 'No lab is running');
    if (s.state !== 'running') throw new HttpError(409, `The lab is ${s.state}, not running`);
    return s;
  }

  // Resets the idle countdown.
  touch() {
    const s = this.session;
    if (!s || s.state !== 'running') return;
    const now = Date.now();
    const previous = s.expiresAt;
    s.lastActivity = now;
    s.expiresAt = now + this.config.idleTimeoutMs;
    if (!previous || s.expiresAt - previous > 5000) this.emit('event', { type: 'activity', sessionId: s.id, expiresAt: s.expiresAt });
  }

  startIdleTimer(session) {
    clearInterval(this.idleTimer);
    this.idleTimer = setInterval(() => {
      if (this.session !== session || session.state !== 'running') return;
      if (session.submitting) return;
      if (Date.now() >= session.expiresAt) {
        this.logger.log(`Lab ${session.lab.id} stopped after ${Math.round(this.config.idleTimeoutMs / 60000)} idle minutes`);
        this.stop('idle').catch((err) => this.logger.error(err));
      }
    }, Math.min(1000, Math.max(50, Math.floor(this.config.idleTimeoutMs / 20))));
    this.idleTimer.unref?.();
  }

  // Stops the current session and removes all its resources.
  async stop(reason = 'stopped') {
    const session = this.session;
    if (!session) return false;
    session.controller.abort();
    session.state = 'stopping';
    this.emitSession();
    clearInterval(this.idleTimer);
    for (const term of session.terminals.values()) term.close(reason);
    session.terminals.clear();
    if (session.ready) {
      // Give an in-flight launch step a moment to notice the cancellation.
      await Promise.race([session.ready, new Promise((r) => setTimeout(r, 15000).unref?.())]);
    }
    await this.teardown(session);
    if (this.session === session) this.session = null;
    this.emit('event', { type: 'stopped', sessionId: session.id, reason });
    this.emitSession();
    return true;
  }

  async teardown(session) {
    await cleanupSessions(this.engine, session.id);
  }

  // Runs the checker and returns a structured result.
  async submit() {
    const session = this.requireRunning();
    if (session.submitting) throw new HttpError(409, 'A submission is already running');
    session.submitting = true;
    this.touch();
    this.emitSession();
    const started = Date.now();
    try {
      const id = session.containers.lab;
      const dir = `/tmp/.lab-check-${randomHex(8)}`;
      await this.engine.exec(id, { cmd: ['install', '-d', '-m', '700', dir] });
      const files = [
        { name: 'check.py', content: fs.readFileSync(path.join(session.lab.dir, 'check.py')), mode: 0o600 },
        { name: 'labcheck.py', content: fs.readFileSync(path.join(this.labLibDir, 'labcheck.py')), mode: 0o600 },
      ];
      if (session.context) files.push({ name: 'context.json', content: session.context, mode: 0o600 });
      await this.engine.putFiles(id, dir, files);
      const result = await this.engine.exec(id, {
        cmd: ['python3', '-B', `${dir}/check.py`],
        user: 'root',
        env: [...this.labEnv(session), `LAB_DIR=${dir}`, `LAB_CONTEXT_FILE=${dir}/context.json`, 'PYTHONDONTWRITEBYTECODE=1'],
        workdir: '/root',
        timeoutMs: session.lab.timeouts.check * 1000,
      });
      await this.engine.exec(id, { cmd: ['rm', '-rf', dir] });
      const parsed = parseCheckerOutput(result);
      const submission = summarizeResult(parsed, {
        labId: session.lab.id,
        sessionId: session.id,
        startedAt: started,
        runtimeMs: Date.now() - started,
      });
      submission.log = this.logView(session);
      return submission;
    } finally {
      session.submitting = false;
      this.touch();
      this.emitSession();
    }
  }

  // Runs the lab's automated solution as the lab user (self-test only).
  async solve() {
    const session = this.requireRunning();
    this.touch();
    const id = session.containers.lab;
    const dir = `/tmp/.lab-solve-${randomHex(8)}`;
    await this.engine.exec(id, { cmd: ['install', '-d', '-m', '755', dir] });
    const files = [{ name: 'solve.sh', content: fs.readFileSync(path.join(session.lab.dir, 'solve.sh')), mode: 0o755 }];
    const assets = path.join(session.lab.dir, 'solution-files');
    if (fs.existsSync(assets)) files.push(...readTree(assets).map((f) => ({ ...f, name: `files/${f.name}` })));
    await this.engine.putFiles(id, dir, files);
    const result = await this.engine.exec(id, {
      cmd: ['bash', '-l', `${dir}/solve.sh`],
      user: LAB_USER,
      env: [...this.labEnv(session), `LAB_DIR=${dir}`, 'HOME=/home/user', 'USER=user'],
      workdir: '/home/user',
      timeoutMs: session.lab.timeouts.solve * 1000,
    });
    await this.engine.exec(id, { cmd: ['rm', '-rf', dir] });
    this.touch();
    return { exitCode: result.exitCode, stdout: result.stdout.slice(-20000), stderr: result.stderr.slice(-20000) };
  }

  // Opens a terminal tab. Returns a handle the WebSocket layer drives.
  async openTerminal(tabId, { cols = 80, rows = 24 } = {}) {
    const session = this.requireRunning();
    const existing = session.terminals.get(tabId);
    if (existing) existing.close('replaced');
    const { stream, resize } = await this.engine.execTty(session.containers.lab, {
      cmd: ['bash', '-l'],
      user: LAB_USER,
      env: ['TERM=xterm-256color', 'HOME=/home/user', 'USER=user', 'LANG=C.UTF-8', `COLUMNS=${cols}`, `LINES=${rows}`],
      workdir: '/home/user',
      cols,
      rows,
    });
    const listeners = new Set();
    const term = {
      tabId,
      write: (data) => {
        this.touch();
        stream.write(data);
      },
      resize: (c, r) => resize(c, r),
      onData: (fn) => listeners.add(fn),
      onClose: null,
      closed: false,
      close: (reason) => {
        if (term.closed) return;
        term.closed = true;
        stream.end();
        stream.destroy?.();
        term.onClose?.(reason);
      },
    };
    stream.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      this.appendLog(session, tabId, text);
      for (const fn of listeners) fn(text);
    });
    stream.on('end', () => {
      if (session.terminals.get(tabId) === term) session.terminals.delete(tabId);
      term.close('exited');
    });
    session.terminals.set(tabId, term);
    await resize(cols, rows);
    return term;
  }

  appendLog(session, tabId, text) {
    const log = session.log;
    if (log.lastTab !== null && log.lastTab !== tabId) log.data += `\r\n[Terminal ${tabId}]\r\n`;
    log.lastTab = tabId;
    log.data += text;
    if (log.data.length > LOG_LIMIT) log.data = log.data.slice(log.data.length - LOG_LIMIT);
  }

  logView(session = this.session) {
    if (!session) return null;
    return { sessionId: session.id, labId: session.lab.id, hostname: session.hostname, startedAt: session.log.startedAt, data: session.log.data };
  }

  async shutdown() {
    clearInterval(this.idleTimer);
    await this.stop('shutdown');
  }
}

function readTree(dir) {
  const files = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, name);
      else files.push({ name, content: fs.readFileSync(full), mode: 0o755 });
    }
  };
  walk(dir, '');
  return files;
}

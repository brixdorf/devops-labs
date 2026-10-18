import { describe, expect, it } from 'vitest';
import { checkerOutput, setup, waitForState } from './helpers.js';
import { PROJECT_LABEL, SESSION_LABEL } from '../server/config.js';

function sessionContainers(engine, sessionId) {
  return [...engine.containers.values()].filter((c) => c.Labels[SESSION_LABEL] === sessionId);
}

describe('session lifecycle', () => {
  it('launches a lab: builds images, creates network and container, runs setup', async () => {
    const { manager, engine } = setup();
    const view = await manager.launch('first-lab');
    expect(view.state).toBe('launching');
    expect(view.hostname).toMatch(/^[0-9a-f]{12}$/);
    const running = await waitForState(manager, 'running');
    expect(running.expiresAt).toBeGreaterThan(Date.now());
    expect(engine.builds.some((t) => t.startsWith('devops-labs/base:'))).toBe(true);
    const containers = sessionContainers(engine, running.id);
    expect(containers.map((c) => c.Labels['org.devopslabs.role'])).toEqual(['lab']);
    const lab = containers[0];
    expect(lab.Labels[PROJECT_LABEL]).toBe('devops-labs');
    expect(lab.spec.Hostname).toBe(running.hostname);
    expect([...engine.networks.values()].some((n) => n.Labels[SESSION_LABEL] === running.id)).toBe(true);
    const setupRun = engine.execLog.find((e) => e.cmd[0] === 'bash' && String(e.cmd[1]).endsWith('/setup.sh'));
    expect(setupRun).toBeTruthy();
    expect(running.progress).toContain('Lab is ready');
  });

  it('runs only one lab at a time: a new launch removes the previous session', async () => {
    const { manager, engine } = setup();
    await manager.launch('first-lab');
    const first = await waitForState(manager, 'running');
    await manager.launch('second-lab');
    const second = await waitForState(manager, 'running');
    expect(second.id).not.toBe(first.id);
    expect(second.labId).toBe('second-lab');
    expect(sessionContainers(engine, first.id)).toHaveLength(0);
    expect([...engine.networks.values()].some((n) => n.Labels[SESSION_LABEL] === first.id)).toBe(false);
    expect(sessionContainers(engine, second.id)).toHaveLength(1);
  });

  it('a new launch cancels a launch that is still in progress', async () => {
    const { manager, engine } = setup();
    let release;
    const gate = new Promise((r) => (release = r));
    engine.execHandler = (role, cmd) => (cmd[0] === 'bash' && String(cmd[1]).endsWith('setup.sh') ? gate.then(() => ({})) : undefined);
    await manager.launch('first-lab');
    await new Promise((r) => setTimeout(r, 50));
    const firstId = manager.view().id;
    const relaunch = manager.launch('second-lab');
    release();
    await relaunch;
    const second = await waitForState(manager, 'running');
    expect(second.labId).toBe('second-lab');
    await new Promise((r) => setTimeout(r, 50));
    expect(sessionContainers(engine, firstId)).toHaveLength(0);
  });

  it('stops the lab and removes its containers, networks and volumes', async () => {
    const { manager, engine } = setup();
    await manager.launch('docker-lab');
    const running = await waitForState(manager, 'running');
    expect([...engine.volumes.values()].some((v) => v.Labels[SESSION_LABEL] === running.id)).toBe(true);
    expect(await manager.stop('user')).toBe(true);
    expect(manager.view()).toBeNull();
    expect(sessionContainers(engine, running.id)).toHaveLength(0);
    expect([...engine.networks.values()]).toHaveLength(0);
    expect([...engine.volumes.values()].some((v) => v.Labels[SESSION_LABEL] === running.id)).toBe(false);
    expect(await manager.stop('user')).toBe(false);
  });

  it('keeps image cache volumes when a lab stops', async () => {
    const { manager, engine } = setup();
    await manager.launch('docker-lab');
    await waitForState(manager, 'running');
    expect(engine.volumes.has('devops-labs-cache-docker-hub')).toBe(true);
    await manager.stop();
    expect(engine.volumes.has('devops-labs-cache-docker-hub')).toBe(true);
  });

  it('starts environment services and add-on services', async () => {
    const { manager, engine } = setup();
    await manager.launch('docker-lab');
    let s = await waitForState(manager, 'running');
    expect(sessionContainers(engine, s.id).map((c) => c.Labels['org.devopslabs.role']).sort()).toEqual(['lab', 'mirror-docker']);
    const lab = sessionContainers(engine, s.id).find((c) => c.Labels['org.devopslabs.role'] === 'lab');
    expect(lab.spec.HostConfig.Privileged).toBe(true);
    await manager.launch('gitea-lab');
    s = await waitForState(manager, 'running');
    expect(sessionContainers(engine, s.id).map((c) => c.Labels['org.devopslabs.role']).sort()).toEqual(['gitea', 'lab', 'runner']);
    expect(s.services.map((x) => x.name)).toEqual(['gitea']);
    const gitea = sessionContainers(engine, s.id).find((c) => c.Labels['org.devopslabs.role'] === 'gitea');
    expect(gitea.spec.HostConfig.PortBindings['3000/tcp'][0]).toEqual({ HostIp: '127.0.0.1', HostPort: '8801' });
  });

  it('stops the lab after the idle timeout', async () => {
    const { manager, engine } = setup({ config: { idleTimeoutMs: 300 } });
    await manager.launch('first-lab');
    const running = await waitForState(manager, 'running');
    const events = [];
    manager.on('event', (e) => events.push(e));
    await waitForState(manager, null, 3000);
    expect(sessionContainers(engine, running.id)).toHaveLength(0);
    expect(events.some((e) => e.type === 'stopped' && e.reason === 'idle')).toBe(true);
  });

  it('terminal input resets the idle countdown', async () => {
    const { manager, engine } = setup({ config: { idleTimeoutMs: 400 } });
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    const term = await manager.openTerminal(1, { cols: 100, rows: 30 });
    expect(engine.ttys[0].opts.user).toBe('user');
    for (let i = 0; i < 6; i += 1) {
      await new Promise((r) => setTimeout(r, 150));
      term.write('ls\r');
    }
    expect(manager.view()?.state).toBe('running');
    expect(engine.ttys[0].input.join('')).toContain('ls\r');
    await waitForState(manager, null, 3000);
  });

  it('records terminal output in the session log', async () => {
    const { manager, engine } = setup();
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    await manager.openTerminal(1);
    await manager.openTerminal(2);
    engine.ttys[0].stream.emitOutput('hello from one\r\n');
    engine.ttys[1].stream.emitOutput('hello from two\r\n');
    const log = manager.logView();
    expect(log.data).toContain('hello from one');
    expect(log.data).toContain('[Terminal 2]');
    expect(log.data).toContain('hello from two');
    expect(log.startedAt).toMatch(/^\d{4}-/);
  });

  it('marks a launch as failed and cleans up when setup fails', async () => {
    const { manager, engine } = setup();
    engine.execHandler = (role, cmd) => (cmd[0] === 'bash' && String(cmd[1]).endsWith('setup.sh') ? { exitCode: 3, stdout: 'boom' } : undefined);
    await manager.launch('first-lab');
    const failed = await waitForState(manager, 'failed');
    expect(failed.error).toMatch(/setup failed/);
    await new Promise((r) => setTimeout(r, 20));
    expect(sessionContainers(engine, failed.id)).toHaveLength(0);
  });

  it('rejects unknown labs', async () => {
    const { manager } = setup();
    await expect(manager.launch('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('submissions', () => {
  it('copies the checker in, runs it as root, removes it and parses the result', async () => {
    const { manager, engine } = setup();
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    engine.execHandler = (role, cmd) =>
      cmd[0] === 'python3' ? { stdout: checkerOutput([{ name: 'file exists', status: 'passed', message: 'Found it' }]) } : undefined;
    const sub = await manager.submit();
    expect(sub.verdict).toBe('correct');
    expect(sub.total).toBe(1);
    expect(sub.passed).toBe(1);
    expect(sub.log.sessionId).toBe(manager.view().id);
    const checkerRun = engine.execLog.find((e) => e.cmd[0] === 'python3');
    expect(checkerRun.user).toBe('root');
    const dir = checkerRun.cmd[2].replace('/check.py', '');
    expect([...engine.files.keys()].some((k) => k.endsWith(`${dir}/check.py`))).toBe(true);
    expect(engine.execLog.some((e) => e.cmd[0] === 'rm' && e.cmd[2] === dir)).toBe(true);
  });

  it('reports a wrong answer with failure reasons', async () => {
    const { manager, engine } = setup();
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    engine.execHandler = (role, cmd) =>
      cmd[0] === 'python3'
        ? {
            stdout: checkerOutput([
              { name: 'greeting', status: 'failed', message: "Expected 'Hello, World!' but found 'Hello, World'" },
              { name: 'shebang', status: 'passed', message: 'ok' },
            ]),
          }
        : undefined;
    const sub = await manager.submit();
    expect(sub.verdict).toBe('wrong');
    expect(sub.passed).toBe(1);
    expect(sub.tests[0].message).toContain("Expected 'Hello, World!'");
  });

  it('refuses to submit when no lab is running', async () => {
    const { manager } = setup();
    await expect(manager.submit()).rejects.toMatchObject({ status: 409 });
  });

  it('a submission resets the idle countdown', async () => {
    const { manager } = setup({ config: { idleTimeoutMs: 400 } });
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    for (let i = 0; i < 4; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      await manager.submit();
    }
    expect(manager.view()?.state).toBe('running');
  });

  it('runs the solution script as the lab user', async () => {
    const { manager, engine } = setup();
    await manager.launch('first-lab');
    await waitForState(manager, 'running');
    const result = await manager.solve();
    expect(result.exitCode).toBe(0);
    const run = engine.execLog.find((e) => e.cmd.some((c) => String(c).endsWith('solve.sh')));
    expect(run.user).toBe('user');
  });
});

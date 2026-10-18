// HTTP API, server-sent events and terminal WebSockets.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';
import { readLabText } from './labs.js';
import { resetEverything } from './cleanup.js';
import { CREDENTIALS, SUDO_PASSWORD } from './services.js';
import { HttpError } from './util.js';
import { labImageVars } from './config.js';

export function labTextVars(config) {
  const p = config.hostPorts;
  return {
    GITEA_URL: `http://localhost:${p.gitea}`,
    GITEA_USER: CREDENTIALS.gitea.user,
    GITEA_PASSWORD: CREDENTIALS.gitea.password,
    GRAFANA_URL: `http://localhost:${p.grafana}`,
    GRAFANA_USER: CREDENTIALS.grafana.user,
    GRAFANA_PASSWORD: CREDENTIALS.grafana.password,
    PROMETHEUS_URL: `http://localhost:${p.prometheus}`,
    ARGOCD_URL: `http://localhost:${p.argocd}`,
    ARGOCD_USER: CREDENTIALS.argocd.user,
    ARGOCD_PASSWORD: CREDENTIALS.argocd.password,
    REGISTRY_USER: CREDENTIALS.registry.user,
    REGISTRY_PASSWORD: CREDENTIALS.registry.password,
    SUDO_PASSWORD,
    ...labImageVars(config.versions),
  };
}

function labSummary(lab) {
  return {
    id: lab.id,
    title: lab.title,
    topic: lab.topic,
    order: lab.order,
    environment: lab.environment,
    addons: lab.addons,
    maxScore: lab.maxScore,
  };
}

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp({ manager, catalog, images, config, engine, selftestToken }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  const vars = labTextVars(config);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/topics', (req, res) => {
    res.json({
      topics: catalog.topics.map((t) => ({ id: t.id, name: t.name, order: t.order, description: t.description, labs: t.labs.map(labSummary) })),
    });
  });

  app.get('/api/labs/:id', (req, res) => {
    const lab = catalog.labs.get(req.params.id);
    if (!lab) throw new HttpError(404, `Unknown lab "${req.params.id}"`);
    res.json({
      ...labSummary(lab),
      question: readLabText(lab, 'question.md', vars),
      help: {
        hint: readLabText(lab, 'hint.md', vars),
        approach: readLabText(lab, 'approach.md', vars),
        solution: readLabText(lab, 'solution.md', vars),
      },
    });
  });

  app.get(
    '/api/environments',
    asyncRoute(async (req, res) => {
      res.json({ images: await images.status() });
    }),
  );

  app.get('/api/session', (req, res) => res.json({ session: manager.view() }));

  app.post(
    '/api/session',
    asyncRoute(async (req, res) => {
      const labId = req.body?.labId;
      if (typeof labId !== 'string' || !labId) throw new HttpError(400, 'labId is required');
      if (!catalog.labs.has(labId)) throw new HttpError(404, `Unknown lab "${labId}"`);
      const session = await manager.launch(labId);
      res.status(202).json({ session });
    }),
  );

  app.delete(
    '/api/session',
    asyncRoute(async (req, res) => {
      const stopped = await manager.stop('user');
      if (!stopped) throw new HttpError(404, 'No lab is running');
      res.status(204).end();
    }),
  );

  app.post(
    '/api/session/submit',
    asyncRoute(async (req, res) => {
      res.json({ submission: await manager.submit() });
    }),
  );

  app.get('/api/session/log', (req, res) => {
    const log = manager.logView();
    if (!log) throw new HttpError(404, 'No lab session');
    res.json({ log });
  });

  app.post(
    '/api/reset',
    asyncRoute(async (req, res) => {
      if (req.body?.confirm !== 'reset-everything') throw new HttpError(400, 'Confirmation is required');
      await manager.stop('reset');
      const removed = await resetEverything(engine);
      res.json({ removed });
    }),
  );

  // Used only by the self-test, which reads the token inside the app container.
  app.post(
    '/api/selftest/solve',
    asyncRoute(async (req, res) => {
      const given = String(req.get('x-selftest-token') || '');
      const ok = selftestToken && given.length === selftestToken.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(selftestToken));
      if (!ok) throw new HttpError(403, 'Forbidden');
      res.json({ result: await manager.solve() });
    }),
  );

  app.get('/api/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    send({ type: 'session', session: manager.view() });
    manager.on('event', send);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => {
      clearInterval(ping);
      manager.off('event', send);
    });
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  if (config.webDir && fs.existsSync(config.webDir)) {
    app.use(express.static(config.webDir, { index: 'index.html', maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(config.webDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: err.message || 'Internal error' });
  });

  return app;
}

// Terminal WebSocket: /api/terminal?session=<id>&tab=<n>&cols=..&rows=..
// Client messages: {type:"input",data} | {type:"resize",cols,rows}
// Server messages: {type:"output",data} | {type:"exit",reason} | {type:"error",message}
export function attachTerminalServer(server, manager) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/terminal') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => handleTerminal(ws, url, manager));
  });
  return wss;
}

async function handleTerminal(ws, url, manager) {
  const send = (msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
  const current = manager.view();
  const tab = Number.parseInt(url.searchParams.get('tab') || '1', 10);
  if (!current || current.id !== url.searchParams.get('session') || current.state !== 'running') {
    send({ type: 'error', message: 'This lab session is not running' });
    ws.close();
    return;
  }
  if (!Number.isInteger(tab) || tab < 1 || tab > 20) {
    send({ type: 'error', message: 'Invalid terminal tab' });
    ws.close();
    return;
  }
  const cols = clamp(url.searchParams.get('cols'), 20, 500, 80);
  const rows = clamp(url.searchParams.get('rows'), 5, 200, 24);
  let term;
  try {
    term = await manager.openTerminal(tab, { cols, rows });
  } catch (err) {
    send({ type: 'error', message: err.message });
    ws.close();
    return;
  }
  term.onData((data) => send({ type: 'output', data }));
  term.onClose = (reason) => {
    send({ type: 'exit', reason });
    ws.close();
  };
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === 'input' && typeof msg.data === 'string') term.write(msg.data);
    else if (msg.type === 'resize') term.resize(clamp(msg.cols, 20, 500, 80), clamp(msg.rows, 5, 200, 24));
  });
  ws.on('close', () => term.close('disconnected'));
}

function clamp(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

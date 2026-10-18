import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import WebSocket from 'ws';
import { attachTerminalServer, createApp } from '../server/api.js';
import { checkerOutput, setup, waitForState } from './helpers.js';

const TOKEN = 'a'.repeat(64);

function makeApp(options) {
  const ctx = setup(options);
  const app = createApp({ ...ctx, selftestToken: TOKEN });
  return { ...ctx, app };
}

async function launched(options) {
  const ctx = makeApp(options);
  await request(ctx.app).post('/api/session').send({ labId: 'first-lab' }).expect(202);
  await waitForState(ctx.manager, 'running');
  return ctx;
}

const servers = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

describe('API', () => {
  it('GET /api/health', async () => {
    const { app } = makeApp();
    await request(app).get('/api/health').expect(200, { ok: true });
  });

  it('GET /api/topics lists topics and labs without file paths', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/topics').expect(200);
    expect(res.body.topics[0].name).toBe('Sample Topic');
    expect(res.body.topics[0].labs[0]).toEqual({
      id: 'first-lab',
      title: 'First Lab',
      topic: 'sample',
      order: 1,
      environment: 'base',
      addons: [],
      maxScore: 50,
    });
  });

  it('GET /api/labs/:id returns the question and help text', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/labs/first-lab').expect(200);
    expect(res.body.question).toBe('Do the thing.');
    expect(res.body.help).toEqual({ hint: 'A hint.', approach: 'An approach.', solution: 'The solution.' });
    expect(res.body.dir).toBeUndefined();
  });

  it('GET /api/labs/:id returns 404 for unknown labs', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/labs/missing').expect(404);
    expect(res.body.error).toMatch(/Unknown lab/);
  });

  it('GET /api/environments reports which images are built', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/environments').expect(200);
    expect(res.body.images.base).toBe(false);
  });

  it('GET /api/session is null before a launch', async () => {
    const { app } = makeApp();
    await request(app).get('/api/session').expect(200, { session: null });
  });

  it('POST /api/session validates its input', async () => {
    const { app } = makeApp();
    await request(app).post('/api/session').send({}).expect(400);
    await request(app).post('/api/session').send({ labId: 42 }).expect(400);
    await request(app).post('/api/session').send({ labId: 'nope' }).expect(404);
  });

  it('POST /api/session launches and GET /api/session shows it', async () => {
    const { app, manager } = makeApp();
    const res = await request(app).post('/api/session').send({ labId: 'first-lab' }).expect(202);
    expect(res.body.session.labId).toBe('first-lab');
    await waitForState(manager, 'running');
    const cur = await request(app).get('/api/session').expect(200);
    expect(cur.body.session.state).toBe('running');
    expect(cur.body.session.idleTimeoutMs).toBe(60000);
  });

  it('DELETE /api/session stops the lab, and 404s when nothing runs', async () => {
    const { app } = await launched();
    await request(app).delete('/api/session').expect(204);
    await request(app).get('/api/session').expect(200, { session: null });
    await request(app).delete('/api/session').expect(404);
  });

  it('POST /api/session/submit returns 409 without a running lab', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/session/submit').expect(409);
    expect(res.body.error).toMatch(/No lab is running/);
  });

  it('POST /api/session/submit returns the evaluation', async () => {
    const { app, engine } = await launched();
    engine.execHandler = (role, cmd) => (cmd[0] === 'python3' ? { stdout: checkerOutput([{ name: 't', status: 'passed', message: 'ok' }]) } : undefined);
    const res = await request(app).post('/api/session/submit').expect(200);
    expect(res.body.submission).toMatchObject({ verdict: 'correct', total: 1, passed: 1, labId: 'first-lab' });
    expect(typeof res.body.submission.runtimeMs).toBe('number');
  });

  it('GET /api/session/log returns 404 without a session and the log with one', async () => {
    const { app } = makeApp();
    await request(app).get('/api/session/log').expect(404);
    const ctx = await launched();
    const res = await request(ctx.app).get('/api/session/log').expect(200);
    expect(res.body.log.labId).toBe('first-lab');
  });

  it('POST /api/reset needs confirmation and then removes everything', async () => {
    const { app, engine } = await launched();
    await request(app).post('/api/reset').send({}).expect(400);
    const res = await request(app).post('/api/reset').send({ confirm: 'reset-everything' }).expect(200);
    expect(res.body.removed).toHaveProperty('containers');
    expect(engine.containers.size).toBe(0);
    await request(app).get('/api/session').expect(200, { session: null });
  });

  it('POST /api/selftest/solve requires the token', async () => {
    const { app } = await launched();
    await request(app).post('/api/selftest/solve').expect(403);
    await request(app).post('/api/selftest/solve').set('x-selftest-token', 'b'.repeat(64)).expect(403);
    const res = await request(app).post('/api/selftest/solve').set('x-selftest-token', TOKEN).expect(200);
    expect(res.body.result.exitCode).toBe(0);
  });

  it('POST /api/selftest/solve returns 409 without a running lab', async () => {
    const { app } = makeApp();
    await request(app).post('/api/selftest/solve').set('x-selftest-token', TOKEN).expect(409);
  });

  it('unknown API paths return 404 JSON', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/nothing').expect(404);
    expect(res.body.error).toBe('Not found');
  });

  it('GET /api/events streams the current session first', async () => {
    const { app } = makeApp();
    const server = app.listen(0);
    servers.push(server);
    const { port } = server.address();
    const first = await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}/api/events`, (res) => {
          expect(res.headers['content-type']).toMatch(/text\/event-stream/);
          res.once('data', (chunk) => {
            res.destroy();
            resolve(chunk.toString());
          });
        })
        .on('error', reject);
    });
    expect(first).toMatch(/^data: \{"type":"session","session":null\}/);
  });
});

describe('terminal WebSocket', () => {
  async function serve(ctx) {
    const server = http.createServer(ctx.app);
    attachTerminalServer(server, ctx.manager);
    await new Promise((r) => server.listen(0, r));
    servers.push(server);
    return server.address().port;
  }

  function collect(ws) {
    const messages = [];
    ws.on('message', (m) => messages.push(JSON.parse(m.toString())));
    return messages;
  }

  it('refuses a connection when the session is not running', async () => {
    const ctx = makeApp();
    const port = await serve(ctx);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/terminal?session=nope&tab=1`);
    const messages = collect(ws);
    await new Promise((r) => ws.on('close', r));
    expect(messages[0]).toEqual({ type: 'error', message: 'This lab session is not running' });
  });

  it('connects a tab, forwards input and output, and resizes', async () => {
    const ctx = await launched();
    const port = await serve(ctx);
    const id = ctx.manager.view().id;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/terminal?session=${id}&tab=2&cols=120&rows=40`);
    const messages = collect(ws);
    await new Promise((r) => ws.on('open', r));
    await waitUntil(() => ctx.engine.ttys.length === 1);
    const tty = ctx.engine.ttys[0];
    expect(tty.opts).toMatchObject({ user: 'user', cols: 120, rows: 40, cmd: ['bash', '-l'] });
    ws.send(JSON.stringify({ type: 'input', data: 'echo hi\r' }));
    ws.send(JSON.stringify({ type: 'resize', cols: 90, rows: 20 }));
    tty.stream.emitOutput('hi\r\n');
    await waitUntil(() => messages.some((m) => m.type === 'output'));
    expect(messages.find((m) => m.type === 'output').data).toBe('hi\r\n');
    await waitUntil(() => tty.input.join('') === 'echo hi\r' && tty.resizes.some(([c, r]) => c === 90 && r === 20));
    ws.close();
  });

  it('rejects an invalid tab number', async () => {
    const ctx = await launched();
    const port = await serve(ctx);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/terminal?session=${ctx.manager.view().id}&tab=99`);
    const messages = collect(ws);
    await new Promise((r) => ws.on('close', r));
    expect(messages[0].message).toMatch(/Invalid terminal tab/);
  });

  it('closes terminals when the lab stops', async () => {
    const ctx = await launched();
    const port = await serve(ctx);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/terminal?session=${ctx.manager.view().id}&tab=1`);
    const messages = collect(ws);
    await new Promise((r) => ws.on('open', r));
    await waitUntil(() => ctx.engine.ttys.length === 1);
    await ctx.manager.stop('user');
    await new Promise((r) => ws.on('close', r));
    expect(messages.some((m) => m.type === 'exit')).toBe(true);
  });
});

async function waitUntil(fn, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('condition not met');
}

describe('terminal WebSocket timing', () => {
  it('applies a resize sent before the shell has started', async () => {
    const ctx = await launched();
    const server = http.createServer(ctx.app);
    attachTerminalServer(server, ctx.manager);
    await new Promise((r) => server.listen(0, r));
    servers.push(server);
    const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/terminal?session=${ctx.manager.view().id}&tab=1&cols=80&rows=24`);
    await new Promise((r) => ws.on('open', r));
    ws.send(JSON.stringify({ type: 'resize', cols: 132, rows: 40 }));
    await waitUntil(() => ctx.engine.ttys.length === 1 && ctx.engine.ttys[0].resizes.some(([c, r]) => c === 132 && r === 40));
    ws.close();
  });
});

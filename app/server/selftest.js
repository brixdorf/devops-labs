// Lab self-test. For every selected lab: launch it, run the checker and
// expect a failure, run the automated solution, then run the checker again
// and expect every test case to pass.
//
// Run inside the app container:
//   node server/selftest.js [--lab <id>]... [--topic <id>]... [--env <name>]... [--from <id>]
import fs from 'node:fs';
import { loadConfig } from './config.js';

const config = loadConfig();
const base = process.env.DEVOPS_LABS_URL || `http://localhost:${config.listenPort}`;
const token = fs.readFileSync(config.selftestTokenFile, 'utf8').trim();

function parseArgs(argv) {
  const out = { labs: [], topics: [], envs: [], from: null, json: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--lab') out.labs.push(value);
    else if (flag === '--topic') out.topics.push(value);
    else if (flag === '--env') out.envs.push(value);
    else if (flag === '--from') out.from = value;
    else if (flag === '--json') out.json = value;
    else continue;
    i += 1;
  }
  return out;
}

async function api(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-selftest-token': token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}: ${data.error || text}`);
  return data;
}

async function waitRunning(timeoutMs = 30 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    const { session } = await api('GET', '/api/session');
    if (!session) throw new Error('The session disappeared while launching');
    const line = session.progress[session.progress.length - 1];
    if (line && line !== last) {
      last = line;
      console.log(`    ${line}`);
    }
    if (session.state === 'running') return session;
    if (session.state === 'failed') throw new Error(session.error || 'Launch failed');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Timed out waiting for the lab to start');
}

function describe(sub) {
  return sub.tests.map((t, i) => `      #${i + 1} [${t.status}] ${t.name}: ${t.message}`).join('\n');
}

async function selftestLab(lab) {
  const started = Date.now();
  await api('POST', '/api/session', { labId: lab.id });
  await waitRunning();
  const before = (await api('POST', '/api/session/submit')).submission;
  if (before.verdict === 'correct') throw new Error(`The checker passed an untouched lab:\n${describe(before)}`);
  if (before.error) throw new Error(`The checker failed to run: ${before.error}`);
  const solved = (await api('POST', '/api/selftest/solve')).result;
  if (solved.exitCode !== 0) throw new Error(`The solution script failed (exit ${solved.exitCode}):\n${(solved.stderr || solved.stdout).slice(-2000)}`);
  const after = (await api('POST', '/api/session/submit')).submission;
  if (after.verdict !== 'correct') {
    throw new Error(`The checker did not pass after the solution:\n${after.error || ''}\n${describe(after)}\nsolution output:\n${(solved.stdout + solved.stderr).slice(-1500)}`);
  }
  return { before: `${before.passed}/${before.total}`, after: `${after.passed}/${after.total}`, seconds: Math.round((Date.now() - started) / 1000) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { topics } = await api('GET', '/api/topics');
  let labs = topics.flatMap((t) => t.labs);
  if (args.labs.length) labs = labs.filter((l) => args.labs.includes(l.id));
  if (args.topics.length) labs = labs.filter((l) => args.topics.includes(l.topic));
  if (args.envs.length) labs = labs.filter((l) => args.envs.includes(l.environment));
  if (args.from) labs = labs.slice(Math.max(0, labs.findIndex((l) => l.id === args.from)));
  if (!labs.length) {
    console.error('No labs selected');
    process.exit(2);
  }
  console.log(`Self-testing ${labs.length} labs`);
  const results = [];
  for (const lab of labs) {
    console.log(`\n[${results.length + 1}/${labs.length}] ${lab.id} (${lab.environment})`);
    try {
      const r = await selftestLab(lab);
      results.push({ id: lab.id, ok: true, ...r });
      console.log(`  PASS  untouched ${r.before}, solved ${r.after}, ${r.seconds}s`);
    } catch (err) {
      results.push({ id: lab.id, ok: false, error: err.message });
      console.log(`  FAIL  ${err.message}`);
    }
  }
  await api('DELETE', '/api/session').catch(() => {});
  const failed = results.filter((r) => !r.ok);
  console.log(`\nSelf-test finished: ${results.length - failed.length} passed, ${failed.length} failed`);
  for (const f of failed) console.log(`  failed: ${f.id}`);
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

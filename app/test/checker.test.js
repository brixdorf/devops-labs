import { describe, expect, it } from 'vitest';
import { RESULT_MARKER, parseCheckerOutput, summarizeResult } from '../server/checker.js';

const out = (obj) => `noise\n${RESULT_MARKER}${JSON.stringify(obj)}\n`;

describe('checker result parsing', () => {
  it('reads the result line and keeps test order', () => {
    const r = parseCheckerOutput({ exitCode: 0, stdout: out({ tests: [{ name: 'a', status: 'passed', message: 'ok' }, { name: 'b', status: 'failed', message: 'no' }] }) });
    expect(r.error).toBeNull();
    expect(r.tests.map((t) => [t.name, t.status])).toEqual([
      ['a', 'passed'],
      ['b', 'failed'],
    ]);
  });

  it('uses the last result line when there are several', () => {
    const stdout = `${out({ tests: [{ name: 'old', status: 'failed' }] })}${out({ tests: [{ name: 'new', status: 'passed' }] })}`;
    expect(parseCheckerOutput({ exitCode: 0, stdout }).tests[0].name).toBe('new');
  });

  it('maps a boolean passed field and unknown statuses', () => {
    const r = parseCheckerOutput({ exitCode: 0, stdout: out({ tests: [{ name: 'x', passed: true }, { name: 'y', passed: false }, { name: 'z', status: 'weird' }] }) });
    expect(r.tests.map((t) => t.status)).toEqual(['passed', 'failed', 'error']);
  });

  it('fills in missing names and messages', () => {
    const r = parseCheckerOutput({ exitCode: 0, stdout: out({ tests: [{ status: 'passed' }] }) });
    expect(r.tests[0]).toEqual({ name: 'Test case 1', status: 'passed', message: '' });
  });

  it('reports a checker that printed no result', () => {
    const r = parseCheckerOutput({ exitCode: 1, stdout: '', stderr: 'Traceback: boom' });
    expect(r.tests).toEqual([]);
    expect(r.error).toMatch(/no result.*exit code 1.*boom/);
  });

  it('reports invalid JSON', () => {
    const r = parseCheckerOutput({ exitCode: 0, stdout: `${RESULT_MARKER}{not json` });
    expect(r.error).toMatch(/could not be read/);
  });

  it('reports a result without tests', () => {
    expect(parseCheckerOutput({ exitCode: 0, stdout: out({ nope: 1 }) }).error).toMatch(/no test list/);
    expect(parseCheckerOutput({ exitCode: 0, stdout: out({ tests: [] }) }).error).toMatch(/no test cases/);
  });

  it('reports a timeout', () => {
    expect(parseCheckerOutput({ exitCode: 124, stdout: '', timedOut: true }).error).toMatch(/did not finish/);
  });
});

describe('result summary', () => {
  const meta = { labId: 'l', sessionId: 's', startedAt: 0, runtimeMs: 1234 };

  it('is correct only when every test passes', () => {
    const ok = summarizeResult({ tests: [{ status: 'passed' }, { status: 'passed' }], error: null }, meta);
    expect(ok).toMatchObject({ verdict: 'correct', total: 2, passed: 2, errors: 0, runtimeMs: 1234 });
    const bad = summarizeResult({ tests: [{ status: 'passed' }, { status: 'failed' }], error: null }, meta);
    expect(bad).toMatchObject({ verdict: 'wrong', total: 2, passed: 1, errors: 0 });
  });

  it('counts errors and never passes an errored or empty result', () => {
    const errored = summarizeResult({ tests: [{ status: 'passed' }, { status: 'error' }], error: null }, meta);
    expect(errored).toMatchObject({ verdict: 'wrong', errors: 1 });
    const empty = summarizeResult({ tests: [], error: 'no result' }, meta);
    expect(empty).toMatchObject({ verdict: 'wrong', errors: 1, total: 0 });
  });
});

// Parses checker output into structured test results.
export const RESULT_MARKER = '@@DEVOPS_LABS_RESULT@@';

const STATUSES = new Set(['passed', 'failed', 'error']);

// Returns { tests: [{ name, status, message }], error } from an exec result.
export function parseCheckerOutput({ exitCode, stdout = '', stderr = '', timedOut = false }) {
  if (timedOut) return { tests: [], error: 'The checker did not finish in time.' };
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.startsWith(RESULT_MARKER));
  if (!line) {
    const detail = (stderr || stdout).trim().split('\n').slice(-3).join(' ').slice(0, 400);
    return { tests: [], error: `The checker produced no result (exit code ${exitCode}).${detail ? ` ${detail}` : ''}` };
  }
  let data;
  try {
    data = JSON.parse(line.slice(RESULT_MARKER.length));
  } catch (err) {
    return { tests: [], error: `The checker result could not be read: ${err.message}` };
  }
  if (!data || !Array.isArray(data.tests)) return { tests: [], error: 'The checker result has no test list.' };
  const tests = data.tests.map((t, i) => {
    const status = STATUSES.has(t?.status) ? t.status : t?.passed === true ? 'passed' : t?.passed === false ? 'failed' : 'error';
    return {
      name: typeof t?.name === 'string' && t.name ? t.name : `Test case ${i + 1}`,
      status,
      message: typeof t?.message === 'string' ? t.message : '',
    };
  });
  return { tests, error: tests.length ? null : 'The checker reported no test cases.' };
}

export function summarizeResult(parsed, { labId, sessionId, startedAt, runtimeMs }) {
  const total = parsed.tests.length;
  const passed = parsed.tests.filter((t) => t.status === 'passed').length;
  const errors = parsed.tests.filter((t) => t.status === 'error').length + (parsed.error ? 1 : 0);
  const correct = !parsed.error && total > 0 && passed === total;
  return {
    labId,
    sessionId,
    submittedAt: new Date(startedAt).toISOString(),
    runtimeMs,
    total,
    passed,
    errors,
    error: parsed.error,
    verdict: correct ? 'correct' : 'wrong',
    tests: parsed.tests,
  };
}

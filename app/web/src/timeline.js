// The vertical evaluation timeline shown in the Test Cases panel.
import { h, formatDate, formatTime } from './dom.js';
import { icon } from './icons.js';

function step(state, title, detail, extra) {
  const marker =
    state === 'pass'
      ? icon('circle-check', { size: 18, className: 'tl-icon pass' })
      : state === 'fail'
        ? icon('circle-x', { size: 18, className: 'tl-icon fail' })
        : state === 'busy'
          ? icon('loader', { size: 18, className: 'tl-icon busy spin' })
          : h('span.tl-dot');
  return h(`li.tl-step.${state}`, h('div.tl-marker', marker), h('div.tl-body', h('div.tl-title', title), detail ? h('div.tl-detail', detail) : null, extra || null));
}

// result: a submission (or null while evaluating). startedAt: Date or ISO string.
export function renderTimeline({ startedAt, result, onViewLog }) {
  const when = `${formatTime(startedAt)}, ${formatDate(startedAt)}`;
  const list = h('ol.timeline');
  list.append(step('done', 'Initiating Evaluation', when));
  if (!result) {
    list.append(step('busy', 'Evaluating Code', 'Running the checks against your lab...'));
    return list;
  }
  list.append(step('done', 'Evaluating Code', 'Done'));
  const errorCount = result.errors;
  const summary = errorCount
    ? `${result.total} checks, ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`
    : `${result.total} checks, ${result.passed} passed`;
  const logButton = onViewLog
    ? h('button.btn.btn-small.btn-ghost', { type: 'button', onclick: onViewLog, 'data-testid': 'view-session-log' }, icon('scroll-text', { size: 14 }), 'View Session Log')
    : null;
  list.append(step(result.error || errorCount ? 'fail' : 'done', 'Running Test Cases', summary, logButton));
  if (result.error) list.append(step('fail', 'Checker problem', result.error));
  result.tests.forEach((test, i) => {
    const passed = test.status === 'passed';
    const detail = h('div', h('div.tl-test-name', test.name), h(`div.tl-message.${passed ? 'pass' : 'fail'}`, test.message));
    list.append(step(passed ? 'pass' : 'fail', `Test Case #${i + 1}`, detail));
  });
  const correct = result.verdict === 'correct';
  const verdict = h(`span.verdict.${correct ? 'pass' : 'fail'}`, correct ? 'Correct Answer' : 'Wrong Answer');
  list.append(step(correct ? 'pass' : 'fail', 'Final Verdict', verdict));
  return list;
}

import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles.css';
import { api, subscribe } from './api.js';
import { store } from './store.js';
import { h, clear, formatDate, formatRuntime, formatTime } from './dom.js';
import { icon } from './icons.js';
import { renderMarkdown } from './markdown.js';
import { TerminalTabs, createXterm } from './terminal.js';
import { renderTimeline } from './timeline.js';

const state = {
  topics: [],
  labs: new Map(),
  details: new Map(),
  topicId: null,
  labId: null,
  tab: 'question',
  session: null,
  submitting: null,
  viewing: null,
  testsOpen: store.pref('testsOpen', true),
};

// ---------- Layout ----------

const els = {};

function buildShell() {
  const root = document.getElementById('app');
  els.topicButton = h('button.topic-button', { type: 'button', 'aria-haspopup': 'listbox', 'data-testid': 'topic-button' });
  els.topicMenu = h('div.menu.topic-menu', { role: 'listbox', hidden: true });
  els.solved = h('div.solved', { 'data-testid': 'problems-solved' });
  els.settingsButton = h('button.icon-button', { type: 'button', 'aria-label': 'Settings', title: 'Settings', 'data-testid': 'settings-button' }, icon('settings', { size: 18 }));
  els.settingsMenu = h(
    'div.menu.settings-menu',
    { hidden: true, role: 'menu' },
    h('button.menu-item', { type: 'button', role: 'menuitem', onclick: confirmResetProgress, 'data-testid': 'reset-progress' }, icon('rotate-ccw'), 'Reset progress'),
    h('button.menu-item.danger', { type: 'button', role: 'menuitem', onclick: confirmResetEverything, 'data-testid': 'reset-everything' }, icon('triangle-alert'), 'Reset everything'),
  );
  const brand = h(
    'div.brand',
    h('span.brand-mark', { html: '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2563eb"/><path d="M9 11l5 5-5 5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 21.5H23" fill="none" stroke="#7dd3fc" stroke-width="2.6" stroke-linecap="round"/></svg>' }),
    h('span.brand-name', 'DevOps Labs'),
  );
  const topbar = h(
    'header.topbar',
    brand,
    h('div.topic-picker', els.topicButton, els.topicMenu),
    h('div.spacer'),
    els.solved,
    h('div.settings', els.settingsButton, els.settingsMenu),
  );

  els.rail = h('nav.rail', { 'aria-label': 'Labs in this topic' });

  els.panelTabs = h('div.panel-tabs', { role: 'tablist' });
  els.panelBody = h('div.panel-body');
  els.questionPanel = h('section.panel.question-panel', els.panelTabs, els.panelBody);
  const savedWidth = store.pref('questionWidth', null);
  if (savedWidth) els.questionPanel.style.flexBasis = `${savedWidth}px`;
  els.splitter = h('div.splitter', { role: 'separator', 'aria-orientation': 'vertical', title: 'Drag to resize' });

  els.countdown = h('div.countdown', { hidden: true, 'data-testid': 'countdown' });
  els.stopButton = h('button.btn.btn-danger-outline.btn-small', { type: 'button', hidden: true, onclick: stopLab, 'data-testid': 'stop-lab' }, icon('square', { size: 14 }), 'Stop Lab');
  els.fullscreenButton = h('button.icon-button.on-dark', { type: 'button', title: 'Fullscreen', 'aria-label': 'Fullscreen', onclick: toggleFullscreen }, icon('maximize', { size: 16 }));
  els.termTabs = h('div.term-tabs', { role: 'tablist' });
  els.termContainer = h('div.term-container');
  els.stageOverlay = h('div.stage-overlay');
  els.stage = h('div.lab-stage', els.termContainer, els.stageOverlay);
  els.labCard = h(
    'div.lab-card',
    h('header.lab-header', h('div.lab-title', icon('terminal', { size: 16 }), 'DevOps Lab'), h('div.spacer'), els.countdown, els.stopButton, els.fullscreenButton),
    els.termTabs,
    els.stage,
  );

  els.submitButton = h('button.btn.btn-primary', { type: 'button', onclick: submit, disabled: true, 'data-testid': 'submit' }, icon('play', { size: 15 }), 'Run Task And Submit');
  els.testsToggle = h('button.tests-toggle', { type: 'button', onclick: toggleTests, 'aria-expanded': String(state.testsOpen) });
  els.testsBody = h('div.tests-body', { 'data-testid': 'tests-body' });
  els.testsCard = h('div.tests-card', h('header.tests-header', els.testsToggle, h('div.spacer'), els.submitButton), els.testsBody);

  els.labColumn = h('section.lab-column', els.labCard, els.testsCard);
  const workspace = h('main.workspace', els.rail, els.questionPanel, els.splitter, els.labColumn);
  els.modalRoot = h('div.modal-root');
  els.toastRoot = h('div.toast-root', { 'aria-live': 'polite' });
  root.append(topbar, workspace, els.modalRoot, els.toastRoot);

  els.terminals = new TerminalTabs({ tabBar: els.termTabs, container: els.termContainer });

  els.topicButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(els.topicMenu);
  });
  els.settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(els.settingsMenu);
  });
  document.addEventListener('click', () => closeMenus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenus();
  });
  document.addEventListener('fullscreenchange', () => {
    clear(els.fullscreenButton).append(icon(document.fullscreenElement ? 'minimize' : 'maximize', { size: 16 }));
    setTimeout(() => els.terminals.fitActive(), 50);
  });
  setupSplitter();
}

function toggleMenu(menu) {
  const open = menu.hidden;
  closeMenus();
  menu.hidden = !open;
}

function closeMenus() {
  els.topicMenu.hidden = true;
  els.settingsMenu.hidden = true;
}

function setupSplitter() {
  let startX = 0;
  let startWidth = 0;
  const move = (e) => {
    const width = Math.min(Math.max(startWidth + e.clientX - startX, 320), window.innerWidth - 480);
    els.questionPanel.style.flexBasis = `${width}px`;
    els.terminals.fitActive();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('resizing');
    store.setPref('questionWidth', Math.round(els.questionPanel.getBoundingClientRect().width));
  };
  els.splitter.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startWidth = els.questionPanel.getBoundingClientRect().width;
    document.body.classList.add('resizing');
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
}

// ---------- Navigation ----------

function currentTopic() {
  return state.topics.find((t) => t.id === state.topicId) || state.topics[0];
}

function currentLab() {
  return state.labId ? state.labs.get(state.labId) : null;
}

function labNumber(lab) {
  const topic = state.topics.find((t) => t.id === lab.topic);
  return topic ? topic.labs.findIndex((l) => l.id === lab.id) + 1 : 0;
}

function topicNumber(topic) {
  return state.topics.indexOf(topic) + 1;
}

function navigate(topicId, labId, { push = true } = {}) {
  state.topicId = topicId;
  state.labId = labId;
  state.viewing = null;
  if (labId) store.setPref('lastLab', labId);
  store.setPref('lastTopic', topicId);
  const hash = labId ? `#/lab/${labId}` : `#/topic/${topicId}`;
  if (push && location.hash !== hash) history.pushState(null, '', hash);
  renderAll();
  if (labId) loadDetail(labId).then(() => renderPanel());
}

function routeFromHash() {
  const lab = location.hash.match(/^#\/lab\/([a-z0-9-]+)/);
  if (lab && state.labs.has(lab[1])) {
    const l = state.labs.get(lab[1]);
    return navigate(l.topic, l.id, { push: false });
  }
  const topic = location.hash.match(/^#\/topic\/([a-z0-9-]+)/);
  if (topic && state.topics.some((t) => t.id === topic[1])) return navigate(topic[1], null, { push: false });
  const last = store.pref('lastLab');
  if (last && state.labs.has(last)) return navigate(state.labs.get(last).topic, last, { push: false });
  const first = state.topics[0];
  return navigate(first.id, first.labs[0]?.id || null, { push: false });
}

async function loadDetail(labId) {
  if (state.details.has(labId)) return state.details.get(labId);
  const detail = await api.lab(labId);
  state.details.set(labId, detail);
  return detail;
}

// ---------- Rendering ----------

function renderAll() {
  renderTopbar();
  renderRail();
  renderPanel();
  renderStage();
  renderTests();
}

function renderTopbar() {
  const topic = currentTopic();
  if (!topic) return;
  clear(els.topicButton).append(
    h('span.topic-label', 'Topic'),
    h('span.topic-name', `${topicNumber(topic)}. ${topic.name}`),
    icon('chevron-down', { size: 16 }),
  );
  clear(els.topicMenu);
  for (const t of state.topics) {
    const solved = store.solvedCount(t.labs.map((l) => l.id));
    els.topicMenu.append(
      h(
        'button.menu-item',
        {
          type: 'button',
          role: 'option',
          'aria-selected': String(t.id === topic.id),
          class: t.id === topic.id ? 'selected' : '',
          onclick: () => navigate(t.id, t.labs[0]?.id || null),
        },
        h('span.menu-num', `${topicNumber(t)}`),
        h('span.menu-text', t.name),
        h('span.menu-count', `${solved}/${t.labs.length}`),
      ),
    );
  }
  const ids = topic.labs.map((l) => l.id);
  clear(els.solved).append(h('span', 'Problems Solved'), h('strong', `${store.solvedCount(ids)} / ${ids.length}`));
}

function renderRail() {
  const topic = currentTopic();
  clear(els.rail);
  els.rail.append(
    h(
      'button.rail-item.rail-all',
      { type: 'button', class: state.labId ? '' : 'active', title: 'All labs in this topic', onclick: () => navigate(topic.id, null), 'data-testid': 'rail-all' },
      icon('layout-grid', { size: 16 }),
      h('span', 'All'),
    ),
  );
  topic.labs.forEach((lab, i) => {
    const solved = store.labState(lab.id).solved;
    const running = state.session && state.session.labId === lab.id && state.session.state !== 'failed';
    els.rail.append(
      h(
        'button.rail-item',
        {
          type: 'button',
          class: [state.labId === lab.id ? 'active' : '', solved ? 'solved' : ''].join(' '),
          title: lab.title,
          onclick: () => navigate(topic.id, lab.id),
          'data-testid': `rail-q${i + 1}`,
        },
        h('span', `Q${i + 1}`),
        solved ? h('span.rail-check', { 'aria-label': 'Solved' }, icon('check', { size: 11 })) : null,
        running ? h('span.rail-live', { title: 'Running' }) : null,
      ),
    );
  });
}

function renderPanel() {
  const lab = currentLab();
  clear(els.panelTabs);
  if (!lab) {
    els.panelTabs.append(h('div.panel-tab.active', icon('layout-grid', { size: 15 }), 'All labs'));
    clear(els.panelBody).append(renderAllLabs());
    return;
  }
  const tabs = [
    ['question', 'Question', 'book-open'],
    ['help', 'Help with Problem Solving', 'lightbulb'],
    ['submissions', 'Submissions', 'history'],
  ];
  for (const [id, label, ic] of tabs) {
    els.panelTabs.append(
      h(
        'button.panel-tab',
        { type: 'button', role: 'tab', class: state.tab === id ? 'active' : '', 'aria-selected': String(state.tab === id), onclick: () => setTab(id), 'data-testid': `tab-${id}` },
        icon(ic, { size: 15 }),
        label,
      ),
    );
  }
  const detail = state.details.get(lab.id);
  clear(els.panelBody);
  if (!detail) {
    els.panelBody.append(h('div.loading', icon('loader', { className: 'spin' }), 'Loading...'));
    return;
  }
  if (state.tab === 'question') els.panelBody.append(renderQuestion(lab, detail));
  else if (state.tab === 'help') els.panelBody.append(renderHelp(lab, detail));
  else els.panelBody.append(renderSubmissions(lab));
}

function setTab(id) {
  state.tab = id;
  renderPanel();
  els.panelBody.scrollTop = 0;
}

function renderAllLabs() {
  const topic = currentTopic();
  const list = h('div.all-labs');
  list.append(h('h1.panel-title', `${topicNumber(topic)}. ${topic.name}`));
  if (topic.description) list.append(h('p.muted', topic.description));
  topic.labs.forEach((lab, i) => {
    const ls = store.labState(lab.id);
    list.append(
      h(
        'button.lab-row',
        { type: 'button', onclick: () => navigate(topic.id, lab.id) },
        h('span.lab-row-num', `Q${i + 1}`),
        h('span.lab-row-title', lab.title),
        h('span.chip', envLabel(lab.environment)),
        ls.solved ? h('span.badge.badge-success', icon('check', { size: 12 }), 'Solved') : h('span.badge', 'Not solved'),
        h('span.lab-row-score', `${ls.score} / ${lab.maxScore}`),
      ),
    );
  });
  return list;
}

function envLabel(env) {
  return { base: 'Linux', systemd: 'Linux + systemd', docker: 'Docker', kubernetes: 'Kubernetes', terraform: 'Terraform' }[env] || env;
}

const ADDON_LABELS = { gitea: 'Gitea', registry: 'Registry', moto: 'Moto (AWS)', prometheus: 'Prometheus', grafana: 'Grafana', argocd: 'Argo CD' };

function renderQuestion(lab, detail) {
  const ls = store.labState(lab.id);
  const header = h(
    'div.question-header',
    h('h1.panel-title', `Q${labNumber(lab)}. ${lab.title}`, ls.solved ? h('span.badge.badge-success', { 'data-testid': 'solved-badge' }, icon('check', { size: 12 }), 'Solved') : null),
    h(
      'div.question-meta',
      h('span.score', 'Your Score: ', h('strong', { 'data-testid': 'your-score' }, String(ls.score))),
      h('span.score', 'Max Score: ', h('strong', String(lab.maxScore))),
      h('span.chip', envLabel(lab.environment)),
      ...lab.addons.map((a) => h('span.chip.chip-soft', ADDON_LABELS[a] || a)),
    ),
  );
  const services = renderServiceLinks(lab);
  const body = h('div.markdown', { html: renderMarkdown(detail.question) });
  const hint = h(
    'div.hint-box',
    icon('lightbulb', { size: 18 }),
    h('div', h('strong', 'Stuck?'), ' Hints, an approach and the full solution are in the Help tab.'),
    h('button.btn.btn-small', { type: 'button', onclick: () => setTab('help'), 'data-testid': 'use-hint' }, 'Use Hint'),
  );
  return h('div.question', header, services, body, hint);
}

function renderServiceLinks(lab) {
  const uiAddons = lab.addons.filter((a) => ['gitea', 'grafana', 'prometheus', 'argocd'].includes(a));
  if (lab.addons.includes('grafana') && !uiAddons.includes('prometheus')) uiAddons.push('prometheus');
  if (!uiAddons.length) return null;
  const running = state.session && state.session.labId === lab.id && state.session.state === 'running';
  const box = h('div.service-links');
  box.append(h('span.muted', running ? 'Open in your browser:' : 'Web interfaces open here once the lab is running:'));
  const services = running ? state.session.services : [];
  for (const name of uiAddons) {
    const svc = services.find((s) => s.name === name);
    if (svc) {
      const href = `${location.protocol}//${location.hostname}:${svc.port}${svc.path}`;
      box.append(h('a.btn.btn-small', { href, target: '_blank', rel: 'noopener', 'data-testid': `open-${name}` }, icon('external-link', { size: 14 }), svc.label));
    } else {
      box.append(h('span.btn.btn-small.disabled', { 'aria-disabled': 'true' }, icon('external-link', { size: 14 }), `Open ${ADDON_LABELS[name]}`));
    }
  }
  return box;
}

function renderHelp(lab, detail) {
  const ls = store.labState(lab.id);
  const wrap = h('div.help');
  wrap.append(
    h(
      'div.note',
      icon('circle-alert', { size: 16 }),
      h('span', `Viewing the Complete Solution halves this lab's score (from ${lab.maxScore} to ${Math.floor(lab.maxScore / 2)} for later correct submissions).`),
    ),
  );
  const item = (title, md, testid, extra = {}) =>
    h(
      'details.help-item',
      { 'data-testid': testid, ...extra },
      h('summary', h('span', title), icon('chevron-down', { size: 16, className: 'chev' })),
      h('div.markdown', { html: renderMarkdown(md) }),
    );
  wrap.append(item('Hint 1', detail.help.hint, 'help-hint'), item('Solution Approach', detail.help.approach, 'help-approach'));
  const solution = item('Complete Solution', detail.help.solution, 'help-solution');
  if (ls.solutionViewedAt) solution.append(h('div.penalty-note', 'You viewed this solution, so correct submissions now score half.'));
  const summary = solution.querySelector('summary');
  summary.addEventListener('click', async (e) => {
    if (solution.open || store.labState(lab.id).solutionViewedAt) return;
    e.preventDefault();
    const ok = await confirmDialog({
      title: 'View the complete solution?',
      body: [`This lab's score will be halved: later correct submissions earn ${Math.floor(lab.maxScore / 2)} instead of ${lab.maxScore}.`, 'A score you already earned is kept.'],
      confirm: 'View solution',
    });
    if (!ok) return;
    store.markSolutionViewed(lab.id);
    solution.open = true;
    renderPanelKeepScroll();
    els.panelBody.querySelector('[data-testid="help-solution"]')?.setAttribute('open', '');
  });
  wrap.append(solution);
  return wrap;
}

function renderPanelKeepScroll() {
  const top = els.panelBody.scrollTop;
  renderPanel();
  els.panelBody.scrollTop = top;
}

function renderSubmissions(lab) {
  const subs = store.labState(lab.id).submissions;
  if (!subs.length) return h('div.empty', icon('history', { size: 28 }), h('p', 'No submissions yet. Launch the lab, do the task, then click Run Task And Submit.'));
  const rows = [...subs].reverse().map((s) =>
    h(
      'tr',
      { tabindex: '0', class: state.viewing === s ? 'selected' : '', onclick: () => viewSubmission(s), onkeydown: (e) => e.key === 'Enter' && viewSubmission(s) },
      h('td', String(s.no)),
      h('td', `${formatTime(s.time)}, ${formatDate(s.time)}`),
      h('td', h(`span.status.${s.status === 'correct' ? 'pass' : 'fail'}`, s.status === 'correct' ? 'Correct Answer' : 'Wrong Answer')),
      h('td', formatRuntime(s.runtimeMs)),
    ),
  );
  return h(
    'table.submissions',
    { 'data-testid': 'submissions-table' },
    h('thead', h('tr', h('th', 'No.'), h('th', 'Time'), h('th', 'Status'), h('th', 'Runtime'))),
    h('tbody', rows),
  );
}

function viewSubmission(entry) {
  state.viewing = entry;
  state.testsOpen = true;
  renderTests();
  renderPanelKeepScroll();
}

// ---------- Lab stage (right panel) ----------

function sessionForCurrent() {
  const s = state.session;
  return s && state.labId && s.labId === state.labId ? s : null;
}

function renderStage() {
  const lab = currentLab();
  const s = state.session;
  const mine = sessionForCurrent();
  const running = mine?.state === 'running';

  // Show the terminal area before attaching, so new terminals can measure it.
  els.termContainer.hidden = !running;
  els.termTabs.hidden = !running;
  if (s?.state === 'running') els.terminals.attach(s);
  else els.terminals.detach();

  els.stopButton.hidden = !(mine && ['running', 'launching'].includes(mine.state));
  els.countdown.hidden = !running;
  els.labCard.classList.toggle('is-running', running);
  clear(els.stageOverlay);
  els.stageOverlay.hidden = running;
  if (running) {
    requestAnimationFrame(() => els.terminals.fitActive());
  } else if (!lab) {
    els.stageOverlay.append(h('div.stage-message', icon('terminal', { size: 28 }), h('p', 'Pick a lab from the left to get started.')));
  } else if (mine?.state === 'launching') {
    const lines = mine.progress.slice(-8);
    const firstTime = mine.progress.some((l) => l.startsWith('Preparing environment, first time only'));
    els.stageOverlay.append(
      h(
        'div.launching',
        { 'data-testid': 'launching' },
        h('div.spinner', { 'aria-hidden': 'true' }),
        h('h2', 'Launching the Lab'),
        firstTime ? h('p.first-time', 'Preparing environment, first time only. This can take several minutes; later launches are much faster.') : null,
        h('ul.status-lines', lines.map((l, i) => h('li', { class: i === lines.length - 1 ? 'current' : '' }, l))),
      ),
    );
  } else if (mine?.state === 'stopping') {
    els.stageOverlay.append(h('div.launching', h('div.spinner'), h('h2', 'Stopping the Lab')));
  } else {
    const box = h('div.launch-box');
    if (mine?.state === 'failed') {
      box.append(h('div.launch-error', icon('circle-alert', { size: 18 }), h('div', h('strong', 'The lab could not start.'), h('p', mine.error || 'Unknown error'))));
    }
    if (s && s.labId !== lab.id && s.state !== 'failed') {
      const other = state.labs.get(s.labId);
      box.append(
        h(
          'p.launch-note',
          `Another lab is running: Q${other ? labNumber(other) : '?'} ${other?.title || ''}. Launching this lab stops it. `,
          other ? h('a', { href: `#/lab/${other.id}`, onclick: (e) => (e.preventDefault(), navigate(other.topic, other.id)) }, 'Go to the running lab') : null,
        ),
      );
    }
    box.append(
      h('button.btn.btn-launch', { type: 'button', onclick: launchLab, 'data-testid': 'launch-lab' }, icon('play', { size: 18 }), mine?.state === 'failed' ? 'Try Again' : 'Launch Lab'),
    );
    els.stageOverlay.append(box);
  }
  updateSubmitButton();
  updateCountdown();
}

function updateSubmitButton() {
  const mine = sessionForCurrent();
  els.submitButton.disabled = !(mine?.state === 'running') || Boolean(state.submitting);
}

function updateCountdown() {
  const mine = sessionForCurrent();
  if (!mine || mine.state !== 'running' || !mine.expiresAt) return;
  const left = Math.max(0, mine.expiresAt - Date.now());
  const m = Math.floor(left / 60000);
  const sec = Math.floor((left % 60000) / 1000);
  clear(els.countdown).append(icon('timer', { size: 14 }), h('span', 'Stops in '), h('strong', `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`));
  els.countdown.classList.toggle('warn', left < 120000);
}

async function launchLab() {
  const lab = currentLab();
  if (!lab) return;
  state.viewing = null;
  try {
    const { session } = await api.launch(lab.id);
    state.session = session;
    renderStage();
    renderRail();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function stopLab() {
  try {
    await api.stop();
  } catch (err) {
    if (err.status !== 404) toast(err.message, 'error');
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else els.labColumn.requestFullscreen?.();
}

// ---------- Test cases panel ----------

function toggleTests() {
  state.testsOpen = !state.testsOpen;
  store.setPref('testsOpen', state.testsOpen);
  renderTests();
}

function renderTests() {
  clear(els.testsToggle).append(icon(state.testsOpen ? 'chevron-down' : 'chevron-up', { size: 16 }), h('span', 'Test Cases'));
  els.testsToggle.setAttribute('aria-expanded', String(state.testsOpen));
  els.testsCard.classList.toggle('open', state.testsOpen);
  clear(els.testsBody);
  els.testsBody.hidden = !state.testsOpen;
  if (!state.testsOpen) return;
  const lab = currentLab();
  if (state.submitting && lab && state.submitting.labId === lab.id) {
    els.testsBody.append(renderTimeline({ startedAt: state.submitting.startedAt, result: null }));
    return;
  }
  const entry = state.viewing || (lab ? store.labState(lab.id).submissions.at(-1) : null);
  if (!entry || (lab && entry.result.labId !== lab.id)) {
    els.testsBody.append(h('p.muted.tests-empty', 'Your evaluation results appear here after you click Run Task And Submit.'));
    return;
  }
  els.testsBody.append(
    renderTimeline({
      startedAt: entry.time,
      result: entry.result,
      points: entry.points,
      onViewLog: () => openSessionLog(entry.sessionId),
    }),
  );
}

async function submit() {
  const lab = currentLab();
  const mine = sessionForCurrent();
  if (!lab || mine?.state !== 'running' || state.submitting) return;
  state.submitting = { labId: lab.id, startedAt: new Date() };
  state.viewing = null;
  state.testsOpen = true;
  updateSubmitButton();
  renderTests();
  try {
    const { submission } = await api.submit();
    const entry = store.addSubmission(lab, submission);
    state.viewing = entry;
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    state.submitting = null;
    renderTopbar();
    renderRail();
    renderPanelKeepScroll();
    renderTests();
    updateSubmitButton();
  }
}

// ---------- Modals ----------

function modal({ title, content, wide = false, onClose }) {
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const dialog = h(
    `div.modal${wide ? '.modal-wide' : ''}`,
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header.modal-header', h('h2', title), h('button.icon-button', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('x', { size: 18 }))),
    content,
  );
  const overlay = h('div.modal-overlay', { onclick: (e) => e.target === overlay && close() }, dialog);
  document.addEventListener('keydown', onKey);
  els.modalRoot.append(overlay);
  return { close, dialog };
}

function confirmDialog({ title, body, items, footnote, confirm, danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const content = h(
      'div.modal-body',
      ...(body || []).map((p) => h('p', p)),
      items ? h('ul.confirm-list', items.map((i) => h('li', i))) : null,
      footnote ? h('p.muted', footnote) : null,
    );
    const footer = h('footer.modal-footer');
    const m = modal({ title, content: h('div', content, footer), onClose: () => resolve(result) });
    footer.append(
      h('button.btn', { type: 'button', onclick: () => m.close(), 'data-testid': 'confirm-cancel' }, 'Cancel'),
      h(
        `button.btn.${danger ? 'btn-danger' : 'btn-primary'}`,
        {
          type: 'button',
          'data-testid': 'confirm-ok',
          onclick: () => {
            result = true;
            m.close();
          },
        },
        confirm,
      ),
    );
  });
}

function openSessionLog(sessionId) {
  const log = store.getLog(sessionId);
  const content = h('div.log-body', { 'data-testid': 'session-log' });
  if (!log) {
    content.append(h('p.muted', 'The session log for this submission is no longer stored in this browser.'));
    modal({ title: 'Session Log', content, wide: true });
    return;
  }
  const lab = state.labs.get(log.labId);
  const started = new Date(log.startedAt);
  const startLine = `Script started on ${formatDate(started)} ${formatTime(started)} [lab "${lab?.title || log.labId}", host ${log.hostname}]`;
  const { term, fit } = createXterm({ disableStdin: true, cursorBlink: false, scrollback: 50000 });
  const box = h('div.log-terminal');
  content.append(box);
  modal({ title: 'Session Log', content, wide: true, onClose: () => term.dispose() });
  requestAnimationFrame(() => {
    term.open(box);
    fit.fit();
    term.write(`\x1b[2m${startLine}\x1b[0m\r\n`);
    term.write(log.data);
  });
}

async function confirmResetProgress() {
  closeMenus();
  const ok = await confirmDialog({
    title: 'Reset progress?',
    body: ['This clears, in this browser only:'],
    items: ['Solved status of every lab', 'Scores', 'Submissions', 'Session logs'],
    footnote: 'Nothing else changes: a running lab keeps running, and environments and add-on services are not touched.',
    confirm: 'Reset progress',
    danger: true,
  });
  if (!ok) return;
  store.resetProgress();
  state.viewing = null;
  renderAll();
  toast('Progress was reset.');
}

async function confirmResetEverything() {
  closeMenus();
  const ok = await confirmDialog({
    title: 'Reset everything?',
    body: ['This returns DevOps Labs to its just-installed state. It will:'],
    items: [
      'Stop the running lab',
      'Remove every lab container, network and volume',
      'Clear add-on service data (Gitea, the container registry, Grafana, Prometheus, Argo CD and Moto)',
      'Clear the Kubernetes cluster state',
      'Clear your progress in this browser: solved status, scores, submissions and session logs',
    ],
    footnote:
      'The downloaded and built environment images are kept, so the next launch does not repeat the slow first-time setup. Uninstalling and reinstalling DevOps Labs (see the README) removes those too.',
    confirm: 'Reset everything',
    danger: true,
  });
  if (!ok) return;
  try {
    await api.resetEverything();
    store.resetProgress();
    state.viewing = null;
    renderAll();
    toast('DevOps Labs was reset to its just-installed state.');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function toast(message, kind = 'info') {
  const el = h(`div.toast.${kind}`, icon(kind === 'error' ? 'circle-alert' : 'circle-check', { size: 16 }), h('span', message));
  els.toastRoot.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 8000 : 5000);
}

// ---------- Live updates ----------

function onEvent(event) {
  if (event.type === 'session') {
    const previous = state.session;
    state.session = event.session;
    if (previous?.state === 'launching' && event.session?.state === 'running' && event.session.labId === state.labId) toast('The lab is ready.');
    renderStage();
    renderRail();
    if (state.tab === 'question' && currentLab()) renderPanelKeepScroll();
  } else if (event.type === 'progress' && state.session?.id === event.sessionId) {
    state.session.progress = [...state.session.progress, event.line].slice(-40);
    if (state.session.state === 'launching') renderStage();
  } else if (event.type === 'activity' && state.session?.id === event.sessionId) {
    state.session.expiresAt = event.expiresAt;
    updateCountdown();
  } else if (event.type === 'stopped' && event.reason === 'idle') {
    toast('The lab stopped after 15 minutes without activity.');
  }
}

async function main() {
  buildShell();
  try {
    await document.fonts?.load('14px "JetBrains Mono Variable"');
  } catch {
    // Fonts load lazily otherwise.
  }
  const { topics } = await api.topics();
  state.topics = topics;
  for (const t of topics) for (const l of t.labs) state.labs.set(l.id, l);
  const { session } = await api.session();
  state.session = session;
  routeFromHash();
  window.addEventListener('popstate', routeFromHash);
  subscribe(onEvent);
  setInterval(updateCountdown, 1000);
}

main().catch((err) => {
  document.getElementById('app').textContent = `DevOps Labs could not load: ${err.message}`;
});

// Progress (solved status and submissions) and session logs, kept in the
// browser's local storage. Every access is wrapped so a blocked or full
// storage never breaks the app. The storage keys and format are the ones
// v1.0.0 used, so progress survives an update; v1.0.0 also stored scores,
// which are dropped when the progress is loaded.
const KEY = 'devops-labs:progress:v1';
const LOG_PREFIX = 'devops-labs:log:';
const LOG_INDEX = 'devops-labs:logs:v1';
const MAX_LOGS = 20;
const MAX_LOG_CHARS = 400000;

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

function emptyLab() {
  return { solved: false, submissions: [] };
}

function cleanLab(saved) {
  const submissions = Array.isArray(saved?.submissions) ? saved.submissions.filter((s) => s && typeof s === 'object') : [];
  return {
    solved: Boolean(saved?.solved),
    submissions: submissions.map(({ points, penalty, ...entry }) => entry),
  };
}

function load() {
  try {
    const data = JSON.parse(safeGet(KEY) || '{}');
    const labs = {};
    for (const [id, saved] of Object.entries(data?.labs || {})) labs[id] = cleanLab(saved);
    return { labs, prefs: data?.prefs && typeof data.prefs === 'object' ? data.prefs : {} };
  } catch {
    return { labs: {}, prefs: {} };
  }
}

let state = load();
const memoryLogs = new Map();

function save() {
  safeSet(KEY, JSON.stringify(state));
}

function lab(id) {
  if (!state.labs[id]) state.labs[id] = emptyLab();
  return state.labs[id];
}

export const store = {
  labState(id) {
    return state.labs[id] || emptyLab();
  },
  pref(name, fallback = null) {
    return state.prefs?.[name] ?? fallback;
  },
  setPref(name, value) {
    state.prefs = { ...(state.prefs || {}), [name]: value };
    save();
  },
  // Records a submission and returns the stored entry.
  addSubmission(labInfo, submission) {
    const l = lab(labInfo.id);
    const correct = submission.verdict === 'correct';
    const entry = {
      no: (l.submissions.at(-1)?.no || 0) + 1,
      time: submission.submittedAt,
      status: correct ? 'correct' : 'wrong',
      runtimeMs: submission.runtimeMs,
      sessionId: submission.sessionId,
      result: { ...submission, log: undefined },
    };
    l.submissions.push(entry);
    if (l.submissions.length > 50) l.submissions.splice(0, l.submissions.length - 50);
    if (correct) l.solved = true;
    save();
    if (submission.log) this.saveLog(submission.log);
    return entry;
  },
  saveLog(log) {
    const value = { ...log, data: log.data.length > MAX_LOG_CHARS ? log.data.slice(-MAX_LOG_CHARS) : log.data };
    memoryLogs.set(log.sessionId, value);
    let index = [];
    try {
      index = JSON.parse(safeGet(LOG_INDEX) || '[]');
    } catch {
      index = [];
    }
    index = index.filter((id) => id !== log.sessionId);
    index.push(log.sessionId);
    while (index.length > MAX_LOGS) safeRemove(LOG_PREFIX + index.shift());
    if (!safeSet(LOG_PREFIX + log.sessionId, JSON.stringify(value))) {
      // Storage is full: drop the oldest logs and try once more.
      while (index.length > 1) safeRemove(LOG_PREFIX + index.shift());
      safeSet(LOG_PREFIX + log.sessionId, JSON.stringify(value));
    }
    safeSet(LOG_INDEX, JSON.stringify(index));
  },
  getLog(sessionId) {
    if (memoryLogs.has(sessionId)) return memoryLogs.get(sessionId);
    try {
      return JSON.parse(safeGet(LOG_PREFIX + sessionId) || 'null');
    } catch {
      return null;
    }
  },
  solvedCount(labIds) {
    return labIds.filter((id) => state.labs[id]?.solved).length;
  },
  // Clears solved status, submissions and session logs.
  resetProgress() {
    let index = [];
    try {
      index = JSON.parse(safeGet(LOG_INDEX) || '[]');
    } catch {
      index = [];
    }
    for (const id of index) safeRemove(LOG_PREFIX + id);
    safeRemove(LOG_INDEX);
    memoryLogs.clear();
    state = { labs: {}, prefs: state.prefs || {} };
    save();
  },
};

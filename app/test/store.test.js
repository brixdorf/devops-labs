// Browser progress (web/src/store.js) against an in-memory localStorage.
import { describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  constructor(items = {}) {
    this.items = new Map(Object.entries(items));
  }
  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }
  setItem(key, value) {
    this.items.set(key, String(value));
  }
  removeItem(key) {
    this.items.delete(key);
  }
}

async function loadStore(items) {
  const storage = new MemoryStorage(items);
  globalThis.window = { localStorage: storage };
  vi.resetModules();
  const { store } = await import('../web/src/store.js');
  return { store, storage };
}

const LAB = { id: 'linux-basic-commands', title: 'Basic Linux Commands' };

function submission(verdict, at, sessionId = 'aaaa1111') {
  return {
    labId: LAB.id,
    sessionId,
    submittedAt: at,
    runtimeMs: 812,
    total: 6,
    passed: verdict === 'correct' ? 6 : 0,
    errors: 0,
    error: null,
    verdict,
    tests: [{ name: 'answer.txt exists', status: verdict === 'correct' ? 'passed' : 'failed', message: 'ok' }],
    log: { sessionId, labId: LAB.id, hostname: 'lab-1', startedAt: at, data: 'user@lab:~$ pwd\r\n/home/user\r\n' },
  };
}

// Exactly what DevOps Labs v1.0.0 wrote to localStorage after viewing the
// solution, one wrong and one correct submission, and a second lab tried once.
const V1_STORAGE = {
  'devops-labs:progress:v1': JSON.stringify({
    labs: {
      'linux-basic-commands': {
        solved: true,
        score: 25,
        solutionViewedAt: 1760900000000,
        submissions: [
          { no: 1, time: '2026-10-19T19:00:00.000Z', status: 'wrong', runtimeMs: 700, points: 0, penalty: true, sessionId: 'v1session', result: { ...submission('wrong', '2026-10-19T19:00:00.000Z', 'v1session'), log: undefined } },
          { no: 2, time: '2026-10-19T19:05:00.000Z', status: 'correct', runtimeMs: 650, points: 25, penalty: true, sessionId: 'v1session', result: { ...submission('correct', '2026-10-19T19:05:00.000Z', 'v1session'), log: undefined } },
        ],
      },
      'linux-file-permissions': { solved: false, score: 0, solutionViewedAt: null, submissions: [{ no: 1, time: '2026-10-19T20:00:00.000Z', status: 'wrong', runtimeMs: 300, points: 0, penalty: false, sessionId: 'v1other', result: { ...submission('wrong', '2026-10-19T20:00:00.000Z', 'v1other'), labId: 'linux-file-permissions', log: undefined } }] },
    },
    prefs: { lastLab: 'linux-basic-commands', lastTopic: 'linux', testsOpen: false, questionWidth: 610 },
  }),
  'devops-labs:logs:v1': JSON.stringify(['v1session']),
  'devops-labs:log:v1session': JSON.stringify({ sessionId: 'v1session', labId: LAB.id, hostname: 'lab-1', startedAt: '2026-10-19T18:58:00.000Z', data: 'v1 log marker\r\n' }),
};

const SCORE_FIELDS = /"(score|maxScore|points|penalty|solutionViewedAt)"/;

describe('browser progress', () => {
  it('records submissions and solved status without any score', async () => {
    const { store, storage } = await loadStore();
    store.addSubmission(LAB, submission('wrong', '2026-10-20T10:00:00.000Z'));
    const entry = store.addSubmission(LAB, submission('correct', '2026-10-20T10:02:00.000Z'));
    expect(entry).toMatchObject({ no: 2, status: 'correct', sessionId: 'aaaa1111' });
    expect(entry).not.toHaveProperty('points');
    expect(entry).not.toHaveProperty('penalty');
    const state = store.labState(LAB.id);
    expect(state.solved).toBe(true);
    expect(state.submissions.map((s) => s.status)).toEqual(['wrong', 'correct']);
    expect(Object.keys(state).sort()).toEqual(['solved', 'submissions']);
    expect(storage.getItem('devops-labs:progress:v1')).not.toMatch(SCORE_FIELDS);
    expect(store.getLog('aaaa1111').data).toContain('/home/user');
  });

  it('has no solution penalty', async () => {
    const { store } = await loadStore();
    expect(store.markSolutionViewed).toBeUndefined();
    expect(store.labState('never-opened')).toEqual({ solved: false, submissions: [] });
  });

  it('keeps progress saved by v1.0.0 and drops its scores', async () => {
    const { store, storage } = await loadStore(V1_STORAGE);
    expect(store.solvedCount(['linux-basic-commands', 'linux-file-permissions'])).toBe(1);
    const state = store.labState('linux-basic-commands');
    expect(Object.keys(state).sort()).toEqual(['solved', 'submissions']);
    expect(state.submissions.map((s) => [s.no, s.status, s.sessionId])).toEqual([
      [1, 'wrong', 'v1session'],
      [2, 'correct', 'v1session'],
    ]);
    expect(state.submissions[1].result.tests[0].status).toBe('passed');
    expect(state.submissions[1]).not.toHaveProperty('points');
    expect(store.labState('linux-file-permissions').submissions).toHaveLength(1);
    expect(store.pref('lastLab')).toBe('linux-basic-commands');
    expect(store.pref('questionWidth')).toBe(610);
    expect(store.getLog('v1session').data).toBe('v1 log marker\r\n');

    // New submissions continue the numbering and the saved data loses the old score fields.
    store.addSubmission(LAB, submission('correct', '2026-10-20T11:00:00.000Z', 'newsession'));
    expect(store.labState('linux-basic-commands').submissions.at(-1).no).toBe(3);
    expect(storage.getItem('devops-labs:progress:v1')).not.toMatch(SCORE_FIELDS);
    expect(JSON.parse(storage.getItem('devops-labs:logs:v1'))).toEqual(['v1session', 'newsession']);
  });

  it('starts empty when the saved progress is unreadable', async () => {
    const { store } = await loadStore({ 'devops-labs:progress:v1': '{not json' });
    expect(store.labState(LAB.id)).toEqual({ solved: false, submissions: [] });
  });
});

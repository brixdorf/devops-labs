// Every RUN instruction must fail the build when one of its commands fails.
// A fallback such as "a && b || true" or "a && b; true" hides the failure of
// a and b, and a broken image is then cached as if it were fine.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './helpers.js';

function runInstructions(text) {
  return text
    .replace(/\\\r?\n/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^RUN\s/i.test(line))
    .map((line) => line.replace(/^RUN\s+/i, ''));
}

const OPENERS = { if: 'fi', for: 'done', while: 'done', until: 'done', case: 'esac' };
const CLOSERS = new Set(['fi', 'done', 'esac']);

// Splits a shell command into its top-level lists (separated by ;), each with
// its top-level && and || operators. Anything inside quotes, braces,
// subshells, if, loops and case is one opaque part of its list.
function topLevelLists(cmd) {
  const lists = [{ text: '', ops: [] }];
  const stack = [];
  let quote = null;
  let word = '';
  const endWord = () => {
    if (OPENERS[word]) stack.push(OPENERS[word]);
    else if (CLOSERS.has(word) && stack.at(-1) === word) stack.pop();
    word = '';
  };
  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i];
    const list = lists.at(-1);
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"') i += 1;
      list.text += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      list.text += ch;
      continue;
    }
    const prev = cmd[i - 1] ?? ' ';
    const next = cmd[i + 1] ?? ' ';
    if (ch === '{' && /\s/.test(prev) && /\s/.test(next)) stack.push('}');
    else if (ch === '}' && stack.at(-1) === '}' && /[\s;]/.test(prev)) stack.pop();
    else if (ch === '(' && stack.at(-1) !== 'esac') stack.push(')');
    else if (ch === ')' && stack.at(-1) === ')') stack.pop();
    if (/[\s;&|(){}]/.test(ch)) endWord();
    else word += ch;
    if (!stack.length) {
      if ((ch === '&' || ch === '|') && next === ch) {
        list.ops.push(ch + ch);
        list.text += ch + ch;
        i += 1;
        continue;
      }
      if (ch === ';') {
        lists.push({ text: '', ops: [] });
        continue;
      }
    }
    list.text += ch;
  }
  return lists.map((l) => ({ ...l, text: l.text.trim() })).filter((l) => l.text);
}

function hiddenFailures(cmd) {
  const problems = [];
  const lists = topLevelLists(cmd);
  const setE = /^set -[a-z]*e[a-z]*$/.test(lists[0]?.text || '');
  lists.forEach((list, i) => {
    const firstOr = list.ops.indexOf('||');
    if (firstOr > 0 && list.ops.slice(0, firstOr).includes('&&')) problems.push(`"|| ..." also hides failures of the commands before it: ${list.text.slice(0, 120)}`);
    if (i > 0 && !setE) problems.push(`commands after ";" run and decide the result even when earlier ones fail: ${list.text.slice(0, 120)}`);
    if (setE && i < lists.length - 1 && list.ops.includes('&&')) problems.push(`with set -e, an && list before ";" can fail silently: ${list.text.slice(0, 120)}`);
  });
  return problems;
}

function dockerfiles() {
  const found = ['Dockerfile', 'tests/Dockerfile'];
  for (const top of ['environments', 'addons']) {
    for (const name of fs.readdirSync(path.join(repoRoot, top)).sort()) {
      if (fs.existsSync(path.join(repoRoot, top, name, 'Dockerfile'))) found.push(`${top}/${name}/Dockerfile`);
    }
  }
  return found;
}

describe('Dockerfile failure handling', () => {
  it('spots fallbacks that hide earlier failures', () => {
    expect(hiddenFailures('apt-get update && apt-get install -y curl && mandb -q || true')).toHaveLength(1);
    expect(hiddenFailures('apt-get install -y curl && systemctl mask x 2>/dev/null; true')).toHaveLength(1);
    expect(hiddenFailures('set -e; curl -fsSLO x && tar -xf y; echo done')).toHaveLength(1);
  });

  it('accepts commands that fail on any error', () => {
    expect(hiddenFailures('apt-get update && apt-get install -y curl && { mandb -q || true; }')).toEqual([]);
    expect(hiddenFailures('rm -f x && if a | grep -q b; then c; fi && d')).toEqual([]);
    expect(hiddenFailures('set -e; for s in "a b" "c d"; do set -- $s; find "$1" -exec sed -i "s/;/x/" {} +; done')).toEqual([]);
    expect(hiddenFailures('set -e; case "$A" in arm64) X=1 ;; *) X=2 ;; esac; curl "$(cat f)" || exit 1')).toEqual([]);
    expect(hiddenFailures('mkdir -p /out && (cd /tmp && make) && grep -q "a || b" f')).toEqual([]);
  });

  it.each(dockerfiles())('%s fails the build when a command fails', (file) => {
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    const problems = runInstructions(text).flatMap(hiddenFailures);
    expect(problems).toEqual([]);
  });
});

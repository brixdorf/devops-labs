// Repository rules check. Fails when a tracked file contains a long dash, an
// emoji or a banned word, when a commit message breaks the agreed format,
// when a commit has the wrong author, or when private files were committed.
// The banned characters and words are built from character codes so this
// file does not contain them itself.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2] || process.cwd();
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const fromCodes = (...codes) => String.fromCharCode(...codes);

const LONG_DASH = fromCodes(0x2014);
const WORDS = [fromCodes(99, 108, 97, 117, 100, 101), fromCodes(97, 110, 116, 104, 114, 111, 112, 105, 99), fromCodes(97, 105)];
const WORD_PATTERN = new RegExp(`(?<![A-Za-z0-9_])(${WORDS.join('|')})(?![A-Za-z0-9_])`, 'i');
const EMOJI_PATTERN = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
const PRIVATE_FILES = ['devops-labs-brief.md', fromCodes(67, 76, 65, 85, 68, 69) + '.md', '.' + WORDS[0]];
const AUTHOR = 'brixdorf <itsromit@protonmail.com>';
const TYPES = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'];
const IRREGULAR_PAST = new Set(
  'built wrote made set ran split kept put got found took gave began brought bought caught chose came cut did drew drove fell fed felt fought flew forgot froze grew had heard hid held hit hurt knew laid led left lent let lit lost meant met paid read rode rang rose said saw sent shook shot showed shut sang sat slept slid spent spun stood stole struck swept swung taught tore told thought threw understood woke wore won wound withdrew undid rebuilt rewrote reran reset redid split upheld'.split(
    ' ',
  ),
);

const problems = [];
const binaryExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.zip', '.gz']);

// Lock files are generated: integrity hashes are base64 and can contain any
// letter pair, and URLs carry third-party account names. Neither is text we write.
function scrub(file, text) {
  if (file.endsWith('package-lock.json')) return text.replace(/"(integrity|resolved|url)": "[^"]*"/g, '"$1": ""');
  return text;
}

function checkText(label, text) {
  text.split('\n').forEach((line, i) => {
    const where = `${label}:${i + 1}`;
    if (line.includes(LONG_DASH)) problems.push(`${where}: contains a long dash`);
    if (EMOJI_PATTERN.test(line)) problems.push(`${where}: contains an emoji`);
    const m = line.match(WORD_PATTERN);
    if (m) problems.push(`${where}: contains a banned word ("${m[1].length} letters")`);
  });
}

// 1. Tracked files.
const files = git('ls-files', '-z').split('\0').filter(Boolean);
for (const file of files) {
  const base = path.basename(file);
  if (PRIVATE_FILES.some((p) => base.toLowerCase() === p.toLowerCase() || file.toLowerCase().startsWith(`${p.toLowerCase()}/`))) {
    problems.push(`${file}: this file must not be committed`);
  }
  checkText(`${file} (name)`, file);
  if (binaryExt.has(path.extname(file).toLowerCase())) continue;
  const full = path.join(repo, file);
  if (!fs.existsSync(full)) continue;
  const buf = fs.readFileSync(full);
  if (buf.includes(0)) continue;
  checkText(file, scrub(file, buf.toString('utf8')));
}

// 2. Commit history.
let log = '';
try {
  log = git('log', '--format=%H%x1f%an <%ae>%x1f%cn <%ce>%x1f%B%x1e');
} catch {
  log = '';
}
for (const record of log.split('\x1e').map((r) => r.trim()).filter(Boolean)) {
  const [hash, author, committer, body] = record.split('\x1f');
  const short = hash.slice(0, 8);
  const message = (body || '').trim();
  if (author !== AUTHOR) problems.push(`commit ${short}: author is ${author}`);
  if (committer !== AUTHOR) problems.push(`commit ${short}: committer is ${committer}`);
  checkText(`commit ${short} message`, message);
  if (message.includes('\n')) problems.push(`commit ${short}: message must be a single line`);
  const m = message.match(/^([a-z]+): (.+)$/);
  if (!m || !TYPES.includes(m[1])) {
    problems.push(`commit ${short}: "${message.split('\n')[0]}" does not start with one of ${TYPES.join(', ')} and ": "`);
    continue;
  }
  const description = m[2];
  if (description !== description.toLowerCase()) problems.push(`commit ${short}: description must be lowercase`);
  const firstWord = description.split(/\s+/)[0];
  if (!/ed$/.test(firstWord) && !IRREGULAR_PAST.has(firstWord)) problems.push(`commit ${short}: "${firstWord}" is not in the past tense`);
}
try {
  const touched = git('log', '--all', '--name-only', '--format=');
  for (const name of new Set(touched.split('\n').filter(Boolean))) {
    if (PRIVATE_FILES.some((p) => path.basename(name).toLowerCase() === p.toLowerCase())) problems.push(`history: ${name} was committed at some point`);
  }
} catch {
  // No history yet.
}

if (problems.length) {
  console.log(`Rules check failed with ${problems.length} problems:`);
  for (const p of problems.slice(0, 200)) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`Rules check passed: ${files.length} tracked files and the commit history are clean.`);

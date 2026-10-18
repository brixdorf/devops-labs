// Generates the README images: banner (light and dark), social preview,
// section icons and the architecture diagram. Run in the test image:
//   docker compose -f tests/compose.yaml run --rm tests node tools/readme-images.mjs
import fs from 'node:fs';
import path from 'node:path';

const repo = process.env.DEVOPS_LABS_REPO || '/repo';
const out = path.join(repo, 'docs', 'images');
const iconsOut = path.join(out, 'icons');
fs.mkdirSync(iconsOut, { recursive: true });
const deps = '/opt/devops-labs/deps/app/node_modules';
const { chromium } = await import('/opt/devops-labs/deps/tests/node_modules/@playwright/test/index.mjs');

const font = (pkg, file) => fs.readFileSync(path.join(deps, pkg, 'files', file)).toString('base64');
const INTER = font('@fontsource-variable/inter', 'inter-latin-wght-normal.woff2');
const MONO = font('@fontsource-variable/jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2');
const FONT_CSS = `
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${INTER}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: JBMono; src: url(data:font/woff2;base64,${MONO}) format('woff2'); font-weight: 100 800; }
* { margin: 0; box-sizing: border-box; }
body { font-family: Inter, sans-serif; }`;

const MARK = (size) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><rect width="32" height="32" rx="8" fill="#2563eb"/><path d="M9 11l5 5-5 5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 21.5H23" fill="none" stroke="#7dd3fc" stroke-width="2.6" stroke-linecap="round"/></svg>`;

function terminal(lines, width) {
  const rows = lines
    .map(([kind, text]) => {
      if (kind === 'prompt') return `<div style="color:#e6edf3"><span style="color:#4ade80;font-weight:700">user@3f9a1c2b7d4e:~$</span> ${text}</div>`;
      if (kind === 'ok') return `<div style="color:#4ade80">${text}</div>`;
      return `<div style="color:#cbd5e1">${text}</div>`;
    })
    .join('');
  return `<div style="width:${width}px;border-radius:14px;background:#0f1720;box-shadow:0 24px 60px rgba(15,23,32,.35);overflow:hidden">
    <div style="height:38px;background:#17212d;display:flex;align-items:center;gap:8px;padding:0 14px">
      <span style="width:11px;height:11px;border-radius:50%;background:#f87171"></span>
      <span style="width:11px;height:11px;border-radius:50%;background:#facc15"></span>
      <span style="width:11px;height:11px;border-radius:50%;background:#4ade80"></span>
      <span style="margin-left:10px;color:#94a3b8;font-size:14px">DevOps Lab</span>
    </div>
    <div style="padding:18px 20px;font-family:JBMono,monospace;font-size:17px;line-height:1.6">${rows}</div>
  </div>`;
}

const TERM_LINES = [
  ['prompt', 'kubectl get pods'],
  ['out', 'NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; READY&nbsp;&nbsp; STATUS'],
  ['out', 'web-7d9f5c6b8-x2k4p&nbsp;&nbsp; 1/1&nbsp;&nbsp;&nbsp;&nbsp; Running'],
  ['prompt', 'docker compose up -d'],
  ['out', 'Container stack-web-1&nbsp; Started'],
  ['ok', 'Final Verdict: Correct Answer'],
];

function bannerHtml(dark) {
  const bg = dark ? '#0d1117' : '#ffffff';
  const fg = dark ? '#f0f6fc' : '#17202c';
  const muted = dark ? '#9ba7b4' : '#5d6b7c';
  return `<html><head><style>${FONT_CSS} body{background:transparent}</style></head><body>
  <div id="c" style="width:1200px;height:300px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;border-radius:20px;background:${bg};border:1px solid ${dark ? '#30363d' : '#e2e7ee'}">
    <div>
      <div style="display:flex;align-items:center;gap:18px">${MARK(64)}<span style="font-size:54px;font-weight:750;letter-spacing:-.02em;color:${fg}">DevOps Labs</span></div>
      <div style="margin-top:18px;font-size:24px;color:${muted};max-width:560px;line-height:1.4">Hands-on DevOps practice labs with a real Linux terminal in your browser, checked automatically.</div>
    </div>
    <div style="transform:scale(.78);transform-origin:right center">${terminal(TERM_LINES.slice(0, 3).concat([TERM_LINES[5]]), 520)}</div>
  </div></body></html>`;
}

function socialHtml() {
  return `<html><head><style>${FONT_CSS}</style></head><body>
  <div id="c" style="width:1280px;height:640px;background:radial-gradient(ellipse at 20% 20%,#1e3a8a 0%,#0f1720 60%);display:flex;align-items:center;justify-content:space-between;padding:0 90px">
    <div style="max-width:560px">
      <div style="display:flex;align-items:center;gap:20px">${MARK(78)}<span style="font-size:62px;font-weight:780;letter-spacing:-.02em;color:#f8fafc">DevOps Labs</span></div>
      <div style="margin-top:26px;font-size:30px;line-height:1.35;color:#cbd5e1">Practice Linux, Docker, Kubernetes, Terraform and CI/CD in real terminals, on your own machine.</div>
      <div style="margin-top:30px;display:flex;gap:10px;flex-wrap:wrap">${['Linux', 'Docker', 'Kubernetes', 'Terraform', 'GitOps'].map((t) => `<span style="padding:5px 12px;border-radius:999px;background:rgba(125,211,252,.12);color:#7dd3fc;font-size:18px;font-weight:600">${t}</span>`).join('')}</div>
    </div>
    ${terminal(TERM_LINES, 470)}
  </div></body></html>`;
}

async function render(page, html, file, selector = '#c', omitBackground = true) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(selector).screenshot({ path: path.join(out, file), omitBackground });
  console.log(`wrote docs/images/${file}`);
}

// Icons: Lucide (ISC license), drawn in a colour that reads on light and dark.
const ICONS = {
  download: 'download',
  play: 'play',
  square: 'square',
  'refresh-cw': 'refresh-cw',
  trash: 'trash',
  wrench: 'wrench',
  'book-open': 'book-open',
  cpu: 'cpu',
  'mouse-pointer': 'mouse-pointer-click',
  info: 'info',
};

async function writeIcons() {
  for (const [out_, name] of Object.entries(ICONS)) {
    const mod = await import(path.join(deps, 'lucide', 'dist', 'esm', 'icons', `${name}.mjs`));
    const node = mod.default;
    const children = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>\n`;
    fs.writeFileSync(path.join(iconsOut, `${out_}.svg`), svg);
  }
  fs.copyFileSync(path.join(deps, 'lucide', 'LICENSE'), path.join(iconsOut, 'LICENSE'));
  console.log('wrote docs/images/icons/*.svg and the Lucide license');
}

function diagram(dark) {
  const c = dark
    ? { text: '#e6edf3', muted: '#9ba7b4', box: '#161b22', stroke: '#30363d', accent: '#58a6ff', lab: '#0f2a1c', labStroke: '#2ea043', addon: '#1c1f2a', arrow: '#8b949e' }
    : { text: '#17202c', muted: '#5d6b7c', box: '#ffffff', stroke: '#cfd7e2', accent: '#2563eb', lab: '#ecfdf3', labStroke: '#16a34a', addon: '#f6f8fa', arrow: '#6b7280' };
  const font = "font-family=\"Inter, 'Segoe UI', Helvetica, Arial, sans-serif\"";
  const box = (x, y, w, h, title, sub, fill = c.box, stroke = c.stroke) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
  <text x="${x + w / 2}" y="${y + (sub ? h / 2 - 4 : h / 2 + 6)}" text-anchor="middle" ${font} font-size="17" font-weight="650" fill="${c.text}">${title}</text>
  ${sub ? `<text x="${x + w / 2}" y="${y + h / 2 + 18}" text-anchor="middle" ${font} font-size="13" fill="${c.muted}">${sub}</text>` : ''}`;
  const arrow = (x1, y1, x2, y2, label) => `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c.arrow}" stroke-width="2" marker-end="url(#a${dark ? 'd' : 'l'})"/>
  ${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle" ${font} font-size="12.5" fill="${c.muted}">${label}</text>` : ''}`;
  const addons = ['Gitea + Actions runner', 'Container registry', 'Moto (AWS)', 'Prometheus + Grafana', 'k3s cluster + Argo CD'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="400" viewBox="0 0 900 400">
  <title>How DevOps Labs works</title>
  <defs><marker id="a${dark ? 'd' : 'l'}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c.arrow}"/></marker></defs>
  ${box(20, 150, 170, 80, 'Browser', 'localhost:8800')}
  ${arrow(190, 190, 280, 190, 'HTTP + WebSocket')}
  ${box(280, 140, 200, 100, 'DevOps Labs app', 'UI, API, terminals, checkers', c.box, c.accent)}
  ${arrow(480, 175, 580, 110, 'Docker API')}
  ${arrow(480, 205, 580, 285, 'starts on demand')}
  ${box(580, 60, 300, 90, 'Lab container', 'Ubuntu, your terminal, tools', c.lab, c.labStroke)}
  <rect x="580" y="215" width="300" height="170" rx="12" fill="${c.addon}" stroke="${c.stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="730" y="240" text-anchor="middle" ${font} font-size="15" font-weight="650" fill="${c.text}">Add-on services (only when a lab needs them)</text>
  ${addons.map((a, i) => `<text x="600" y="${270 + i * 23}" ${font} font-size="13.5" fill="${c.muted}">${a}</text>`).join('')}
  <line x1="730" y1="150" x2="730" y2="215" stroke="${c.arrow}" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="742" y="188" ${font} font-size="12.5" fill="${c.muted}">private lab network</text>
  <text x="20" y="30" ${font} font-size="13" fill="${c.muted}">Everything runs in Docker on your own machine.</text>
</svg>\n`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setViewportSize({ width: 1300, height: 700 });
await render(page, bannerHtml(false), 'banner-light.png');
await render(page, bannerHtml(true), 'banner-dark.png');
const social = await browser.newPage({ deviceScaleFactor: 1 });
await social.setViewportSize({ width: 1280, height: 640 });
await render(social, socialHtml(), 'social-preview.png', '#c', false);
await browser.close();
await writeIcons();
fs.writeFileSync(path.join(out, 'architecture-light.svg'), diagram(false));
fs.writeFileSync(path.join(out, 'architecture-dark.svg'), diagram(true));
console.log('wrote docs/images/architecture-*.svg');

// Files written from a container belong to root; hand them to the owner of
// the repository folder so they can be edited and committed normally.
const { uid, gid } = fs.statSync(repo);
const chownTree = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    fs.chownSync(full, uid, gid);
    if (entry.isDirectory()) chownTree(full);
  }
};
fs.chownSync(out, uid, gid);
chownTree(out);

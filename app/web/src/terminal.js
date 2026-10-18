// Browser terminals (xterm.js) connected to the lab container over WebSockets.
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { h, clear } from './dom.js';
import { icon } from './icons.js';

export const TERMINAL_THEME = {
  background: '#0f1720',
  foreground: '#e6edf3',
  cursor: '#7dd3fc',
  cursorAccent: '#0f1720',
  selectionBackground: '#2b4a6f',
  black: '#1f2933',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e5e7eb',
  brightBlack: '#6b7280',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
};

export const TERMINAL_FONT = '"JetBrains Mono Variable", "JetBrains Mono", monospace';

export function createXterm(options = {}) {
  const term = new Terminal({
    fontFamily: TERMINAL_FONT,
    fontSize: 14,
    lineHeight: 1.2,
    cursorBlink: true,
    scrollback: 5000,
    allowProposedApi: true,
    theme: TERMINAL_THEME,
    ...options,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new WebLinksAddon());
  const unicode = new Unicode11Addon();
  term.loadAddon(unicode);
  term.unicode.activeVersion = '11';
  return { term, fit };
}

class TerminalTab {
  constructor(manager, id) {
    this.manager = manager;
    this.id = id;
    this.el = h('div.term-pane', { dataset: { tab: String(id) } });
    this.overlay = null;
    const { term, fit } = createXterm();
    this.term = term;
    this.fit = fit;
    term.open(this.el);
    this.installClipboard();
    term.onData((data) => this.send({ type: 'input', data }));
    term.onResize(({ cols, rows }) => this.send({ type: 'resize', cols, rows }));
    this.connect();
  }

  installClipboard() {
    // Ctrl+Shift+C / Ctrl+Shift+V always copy and paste. Plain Ctrl+C copies
    // when text is selected and otherwise interrupts the running command.
    this.term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'c' && (e.shiftKey || this.term.hasSelection())) {
        const text = this.term.getSelection();
        if (text) navigator.clipboard?.writeText(text).catch(() => {});
        this.term.clearSelection();
        e.preventDefault();
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'v') {
        // Let the browser deliver a paste event, which xterm handles.
        return false;
      }
      return true;
    });
  }

  connect() {
    const session = this.manager.session;
    this.removeOverlay();
    this.fitNow();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const params = new URLSearchParams({ session: session.id, tab: String(this.id), cols: String(this.term.cols), rows: String(this.term.rows) });
    const ws = new WebSocket(`${proto}://${location.host}/api/terminal?${params}`);
    this.ws = ws;
    // Resizes sent before the socket opened were dropped, so send the real size now.
    ws.onopen = () => {
      this.fitNow();
      this.send({ type: 'resize', cols: this.term.cols, rows: this.term.rows });
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === 'output') this.term.write(msg.data);
      else if (msg.type === 'error') this.term.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
      else if (msg.type === 'exit' && msg.reason === 'exited') this.showOverlay('The shell has exited.');
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.disposed) return;
      if (!this.overlay && this.manager.session?.state === 'running') this.showOverlay('The terminal connection was closed.');
    };
  }

  showOverlay(message) {
    this.removeOverlay();
    const button = h('button.btn.btn-small', { type: 'button', onclick: () => this.connect() }, icon('rotate-ccw', { size: 14 }), 'Start a new shell');
    this.overlay = h('div.term-overlay', h('p', message), button);
    this.el.append(this.overlay);
  }

  removeOverlay() {
    this.overlay?.remove();
    this.overlay = null;
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  fitNow() {
    if (!this.el.isConnected || this.el.offsetParent === null) return;
    try {
      this.fit.fit();
    } catch {
      // The pane may be hidden.
    }
  }

  dispose() {
    this.disposed = true;
    this.ws?.close();
    this.term.dispose();
    this.el.remove();
  }
}

// Manages the "Terminal 1", "Terminal 2" tabs for one running session.
export class TerminalTabs {
  constructor({ tabBar, container }) {
    this.tabBar = tabBar;
    this.container = container;
    this.tabs = [];
    this.active = null;
    this.session = null;
    this.nextId = 1;
    this.resizeObserver = new ResizeObserver(() => this.fitActive());
    this.resizeObserver.observe(container);
  }

  attach(session) {
    if (this.session?.id === session.id) {
      this.session = session;
      return;
    }
    this.detach();
    this.session = session;
    this.nextId = 1;
    this.add();
  }

  detach() {
    for (const tab of this.tabs) tab.dispose();
    this.tabs = [];
    this.active = null;
    this.session = null;
    this.renderTabs();
  }

  add() {
    if (!this.session || this.tabs.length >= 6) return;
    const tab = new TerminalTab(this, this.nextId++);
    this.tabs.push(tab);
    this.container.append(tab.el);
    this.select(tab.id);
  }

  close(id) {
    if (this.tabs.length <= 1) return;
    const index = this.tabs.findIndex((t) => t.id === id);
    if (index < 0) return;
    const [tab] = this.tabs.splice(index, 1);
    tab.dispose();
    if (this.active === id) this.select(this.tabs[Math.max(0, index - 1)].id);
    else this.renderTabs();
  }

  select(id) {
    this.active = id;
    for (const tab of this.tabs) tab.el.classList.toggle('active', tab.id === id);
    this.renderTabs();
    requestAnimationFrame(() => {
      this.fitActive();
      this.tabs.find((t) => t.id === id)?.term.focus();
    });
  }

  fitActive() {
    this.tabs.find((t) => t.id === this.active)?.fitNow();
  }

  renderTabs() {
    clear(this.tabBar);
    for (const tab of this.tabs) {
      const selected = tab.id === this.active;
      const label = h(
        'button.term-tab',
        { type: 'button', role: 'tab', 'aria-selected': String(selected), class: selected ? 'active' : '', onclick: () => this.select(tab.id) },
        icon('terminal', { size: 14 }),
        `Terminal ${tab.id}`,
      );
      if (this.tabs.length > 1) {
        label.append(
          h(
            'span.term-tab-close',
            {
              role: 'button',
              'aria-label': `Close Terminal ${tab.id}`,
              title: 'Close',
              onclick: (e) => {
                e.stopPropagation();
                this.close(tab.id);
              },
            },
            icon('x', { size: 12 }),
          ),
        );
      }
      this.tabBar.append(label);
    }
    if (this.session && this.tabs.length < 6) {
      this.tabBar.append(
        h('button.term-tab.term-tab-add', { type: 'button', title: 'New terminal', 'aria-label': 'New terminal', onclick: () => this.add() }, icon('plus', { size: 14 })),
      );
    }
  }
}

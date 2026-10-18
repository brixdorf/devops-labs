// Lucide icons (ISC license), imported one by one so only these are bundled.
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileText,
  History,
  LayoutGrid,
  Lightbulb,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Settings,
  Square,
  SquareTerminal,
  Timer,
  TriangleAlert,
  X,
  createElement,
} from 'lucide';

const ICONS = {
  'book-open': BookOpen,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  'external-link': ExternalLink,
  'file-text': FileText,
  history: History,
  'layout-grid': LayoutGrid,
  lightbulb: Lightbulb,
  loader: LoaderCircle,
  maximize: Maximize2,
  minimize: Minimize2,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  'scroll-text': ScrollText,
  settings: Settings,
  square: Square,
  terminal: SquareTerminal,
  timer: Timer,
  'triangle-alert': TriangleAlert,
  x: X,
};

export function icon(name, { size = 16, className = '' } = {}) {
  const node = ICONS[name];
  if (!node) throw new Error(`Unknown icon ${name}`);
  const el = createElement(node);
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('icon');
  if (className) el.classList.add(...className.split(' '));
  return el;
}

// Renders lab text from Markdown. Lab text is part of the repository, so it
// is trusted; links still open in a new tab.
import { Marked } from 'marked';

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const t = title ? ` title="${title}"` : '';
      return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function renderMarkdown(text) {
  return marked.parse(text || '');
}

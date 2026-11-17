// Теория предмета «Цвет и палитра»: обычный Markdown (как у остального сайта). Блоки ```css подсвечиваются.
const MarkdownIt = require('markdown-it');
const { highlightToHtml } = require('../markdown');

const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: true,
  highlight: (code, lang) => {
    const { value, language } = highlightToHtml(code, lang);
    return `<pre><code class="hljs${language ? ` language-${language}` : ''}">${value}</code></pre>`;
  },
});

function renderTheory(text) { return md.render(text.replace(/^# .*\n+/, '')); }
function renderStatement(text) { return md.render(text); }

module.exports = { renderTheory, renderStatement };

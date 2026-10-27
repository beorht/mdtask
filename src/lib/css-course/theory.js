// Теория предмета «Web-разработка: CSS»: Markdown (как у остального сайта) плюс живые примеры.
// Блок ```example [подпись] — CSS, строка «---», HTML: на странице оба кода и рядом вид в браузере (строит
// public/js/css-examples.js в iframe без скриптов). Без «---» весь блок — HTML.
const MarkdownIt = require('markdown-it');
const { highlightToHtml } = require('../markdown');

const escapeAttr = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: true,
  highlight: (code, lang) => {
    const { value, language } = highlightToHtml(code, lang);
    return `<pre><code class="hljs${language ? ` language-${language}` : ''}">${value}</code></pre>`;
  },
});

/** CSS и HTML примера: «CSS\n---\nHTML». */
function splitExample(content) {
  const parts = content.replace(/\n$/, '').split(/^---$/m);
  return parts.length > 1 ? { css: parts[0].trim(), html: parts.slice(1).join('---').trim() } : { css: '', html: parts[0].trim() };
}

const code = (text, lang) => `<pre><code class="hljs language-${lang}">${highlightToHtml(text, lang).value}</code></pre>`;

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const [view, ...captionWords] = token.info.trim().split(/\s+/);
  if (view !== 'example') return defaultFence(tokens, idx, options, env, self);
  const { css, html } = splitExample(token.content);
  const caption = captionWords.join(' ') || 'В браузере';
  return `<figure class="css-example">
<div class="css-example-code">${css ? `<span class="css-example-label">CSS</span>${code(css, 'css')}` : ''}<span class="css-example-label">HTML</span>${code(html, 'html')}</div>
<div class="css-example-view"><span class="html-example-caption">${md.utils.escapeHtml(caption)}</span><div class="css-example-frame" data-css="${escapeAttr(css)}" data-html="${escapeAttr(html)}"></div></div>
</figure>\n`;
};

function renderTheory(text) {
  // Первый заголовок — название темы, его выводит шаблон страницы.
  return md.render(text.replace(/^# .*\n+/, ''));
}

module.exports = { renderTheory, splitExample };

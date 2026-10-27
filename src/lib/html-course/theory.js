// Теория предмета «Web-разработка: HTML»: Markdown (как у остального сайта) плюс живые примеры.
// Блок ```example показывает код и рядом — как его рисует браузер; ```scheme — то же, но вид переключается на
// схему коробками с подписями тег#id.class. Текст после слова в первой строке блока — подпись к виду.
// Вид строит public/js/html-examples.js в изолированном iframe (sandbox без скриптов).
const MarkdownIt = require('markdown-it');
const { highlightToHtml } = require('../markdown');

const VIEWS = { example: 'В браузере', scheme: 'Схема' };
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

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const [view, ...captionWords] = token.info.trim().split(/\s+/);
  if (!VIEWS[view]) return defaultFence(tokens, idx, options, env, self);
  const code = token.content.replace(/\n$/, '');
  const caption = captionWords.join(' ') || VIEWS[view];
  return `<figure class="html-example" data-view="${view === 'scheme' ? 'boxes' : 'clean'}">
<div class="html-example-code"><pre><code class="hljs language-html">${highlightToHtml(code, 'html').value}</code></pre></div>
<div class="html-example-view"><span class="html-example-caption">${md.utils.escapeHtml(caption)}</span><div class="html-example-frame" data-html="${escapeAttr(code)}"></div></div>
</figure>\n`;
};

function renderTheory(text) {
  // Первый заголовок — название темы, его выводит шаблон страницы.
  return md.render(text.replace(/^# .*\n+/, ''));
}

module.exports = { renderTheory };

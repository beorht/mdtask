// Теория и условия курса «Начальный Python»: Markdown (как у остального сайта). Блок ```python run — пример,
// который можно запустить прямо на странице: код, кнопка «▶ Запустить» и вывод (public/js/python-course-theory.js,
// Python в браузере). После слова run можно задать ввод для input(): ```python run input=Анна|17 (строки через |)
// и учебные модули: modules=requests,dotenv (content/python-course/shims/; исходники — в data-modules).
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const { highlightToHtml } = require('../markdown');

const SHIM_DIR = path.join(__dirname, '..', '..', '..', 'content', 'python-course', 'shims');
const shim = (name) => fs.readFileSync(path.join(SHIM_DIR, `${name}.py`), 'utf-8');
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
  const [lang, mode, ...rest] = token.info.trim().split(/\s+/);
  if (lang !== 'python' || mode !== 'run') return defaultFence(tokens, idx, options, env, self);
  const code = token.content.replace(/\n$/, '');
  const args = Object.fromEntries(rest.map((a) => a.split('=')).map(([k, ...v]) => [k, v.join('=')]));
  const stdin = args.input ? args.input.split('|') : [];
  const modules = Object.fromEntries((args.modules ? args.modules.split(',') : []).map((m) => [m, shim(m)]));
  return `<figure class="py-example" data-code="${escapeAttr(code)}" data-stdin="${escapeAttr(JSON.stringify(stdin))}" data-modules="${escapeAttr(JSON.stringify(modules))}">
<pre><code class="hljs language-python">${highlightToHtml(code, 'python').value}</code></pre>
<div class="py-example-bar"><button type="button" class="topic-btn topic-btn-theory py-example-run"><span aria-hidden="true">▶</span> Запустить</button>${stdin.length ? `<span class="py-example-note">ввод: ${md.utils.escapeHtml(stdin.join(', '))}</span>` : ''}</div>
<pre class="code-output py-example-output" hidden></pre>
</figure>\n`;
};

function renderTheory(text) {
  return md.render(text.replace(/^# .*\n+/, ''));
}

function renderStatement(text) {
  return md.render(text);
}

module.exports = { renderTheory, renderStatement };

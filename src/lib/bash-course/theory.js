// Теория и условия предмета «Bash: скрипты в Linux»: Markdown (как у остального сайта). Блок ```bash run —
// пример, который можно запустить прямо на странице: код, кнопка «▶ Запустить» и вывод (public/js/bash-course-theory.js
// через движок public/js/bash-engine.js). После run можно задать ввод: ```bash run input=Анна|17 (строки через |).
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

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const [lang, mode, ...rest] = token.info.trim().split(/\s+/);
  if (!['bash', 'sh', 'shell'].includes(lang) || mode !== 'run') return defaultFence(tokens, idx, options, env, self);
  const code = token.content.replace(/\n$/, '');
  const args = Object.fromEntries(rest.map((a) => a.split('=')).map(([k, ...v]) => [k, v.join('=')]));
  const stdin = args.input ? args.input.split('|') : [];
  const scriptArgs = args.args ? args.args.split('|') : [];
  return `<figure class="py-example" data-code="${escapeAttr(code)}" data-stdin="${escapeAttr(JSON.stringify(stdin))}" data-args="${escapeAttr(JSON.stringify(scriptArgs))}">
<pre><code class="hljs language-bash">${highlightToHtml(code, 'bash').value}</code></pre>
<div class="py-example-bar"><button type="button" class="topic-btn topic-btn-theory py-example-run"><span aria-hidden="true">▶</span> Запустить</button>${stdin.length ? `<span class="py-example-note">ввод: ${md.utils.escapeHtml(stdin.join(', '))}</span>` : ''}</div>
<pre class="code-output py-example-output" hidden></pre>
</figure>\n`;
};

function renderTheory(text) { return md.render(text.replace(/^# .*\n+/, '')); }
function renderStatement(text) { return md.render(text); }

module.exports = { renderTheory, renderStatement };

// tests/lib/markdown.test.js
const test = require('node:test');
const assert = require('node:assert');
const { renderMarkdown, extractHeadings } = require('../../src/lib/markdown');

test('renderMarkdown converts headings and code blocks', () => {
  const html = renderMarkdown('# Title\n\n```js\nconst x = 1;\n```');
  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<pre><code/);
});

test('renderMarkdown heading ids match extractHeadings slugs for the same text', () => {
  const text = '# Задание 1: Настройка репозитория\n\n## Критерии\n\ntext';
  const html = renderMarkdown(text);
  const headings = extractHeadings(text);

  headings.forEach((h) => {
    const tag = `h${h.level}`;
    const re = new RegExp(`<${tag} id="${h.slug}">${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</${tag}>`);
    assert.match(html, re, `expected ${tag} with id="${h.slug}" for text "${h.text}"`);
  });
});

test('extractHeadings returns level, text and slug for each heading', () => {
  const headings = extractHeadings('# Задание 1\n\n## Критерии\n\nтекст\n\n## Ссылки');
  assert.deepStrictEqual(headings, [
    { level: 1, text: 'Задание 1', slug: 'zadanie-1' },
    { level: 2, text: 'Критерии', slug: 'kriterii' },
    { level: 2, text: 'Ссылки', slug: 'ssylki' },
  ]);
});

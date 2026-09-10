// src/lib/markdown.js
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const TRANSLIT_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text) {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function headingContent(tokens, idx) {
  const inline = tokens[idx + 1];
  return inline && inline.type === 'inline' ? inline.content : '';
}

const defaultHeadingOpen =
  md.renderer.rules.heading_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
  const slug = slugify(headingContent(tokens, idx));
  tokens[idx].attrSet('id', slug);
  return defaultHeadingOpen(tokens, idx, options, env, self);
};

function renderMarkdown(text) {
  return md.render(text);
}

function extractHeadings(text) {
  const headings = [];
  const headingPattern = /^(#{1,3})\s+(.*)$/gm;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    const level = match[1].length;
    const headingText = match[2].trim();
    headings.push({ level, text: headingText, slug: slugify(headingText) });
  }
  return headings;
}

module.exports = { renderMarkdown, extractHeadings, slugify };

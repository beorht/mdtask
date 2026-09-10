const path = require('path');
const { parseSummary } = require('./summary-parser');

const INDIVIDUAL_SECTION_TITLE = 'Мои доп. задания';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Appends a new `- [title](mdPath)` entry under an existing top-level
// section (matched by its exact title), or creates that section at the
// end of the file if it doesn't exist yet. Assumes the 2-space nested
// list format produced by parseSummary (src/lib/summary-parser.js).
function addEntryToSummary(summaryText, { sectionTitle, title, mdPath }) {
  const hadTrailingNewline = summaryText.endsWith('\n');
  const lines = summaryText.split('\n');
  const childLine = `  - [${title}](${mdPath})`;
  const sectionPattern = new RegExp(`^-\\s*\\[${escapeRegExp(sectionTitle)}\\]\\(`);

  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line));

  if (sectionIndex === -1) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push(`- [${sectionTitle}]()`, childLine);
    return lines.join('\n') + '\n';
  }

  let insertAt = sectionIndex + 1;
  while (insertAt < lines.length && /^\s{2,}-\s*\[/.test(lines[insertAt])) {
    insertAt++;
  }
  lines.splice(insertAt, 0, childLine);
  return lines.join('\n') + (hadTrailingNewline ? '' : '');
}

// Sections a teacher can drop a new group assignment into: every
// top-level section that already has at least one file-backed child,
// used to infer the directory new assignments in that section should
// live in (e.g. "Раздел 1" -> "section-1").
function listGroupSections(summaryText) {
  const tree = parseSummary(summaryText);
  return tree
    .filter((node) => node.title !== INDIVIDUAL_SECTION_TITLE)
    .map((node) => {
      const childWithPath = (node.children || []).find((c) => c.path);
      return childWithPath ? { title: node.title, dir: path.dirname(childWithPath.path) } : null;
    })
    .filter(Boolean);
}

module.exports = { addEntryToSummary, listGroupSections, INDIVIDUAL_SECTION_TITLE };

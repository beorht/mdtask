// src/lib/summary-parser.js
function parseSummary(text) {
  const lines = text.split('\n');
  const root = [];
  const stack = [{ depth: -1, children: root }];

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s*\[(.*?)\]\((.*?)\)/);
    if (!match) continue;

    const depth = Math.floor(match[1].length / 2);
    const node = { title: match[2], path: match[3] || null, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push({ depth, children: node.children });
  }

  return root;
}

module.exports = { parseSummary };

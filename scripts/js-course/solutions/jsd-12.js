function count(node) {
  if (typeof node === 'number') return [1, node];
  let files = 0;
  let size = 0;
  for (const key in node) {
    const [f, s] = count(node[key]);
    files += f;
    size += s;
  }
  return [files, size];
}
const tree = JSON.parse(input());
let node = tree;
for (const part of input().split('/')) {
  if (node === undefined || typeof node !== 'object') {
    node = undefined;
    break;
  }
  node = node[part];
}
console.log(node === undefined ? 'не найдено' : typeof node === 'object' ? 'папка' : node);
console.log(...count(tree));

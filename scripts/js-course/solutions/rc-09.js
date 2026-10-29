function total(node) {
  if (typeof node === 'number') return node;
  let s = 0;
  for (const key in node) s += total(node[key]);
  return s;
}
const data = JSON.parse(input());
for (const key in data) console.log(key + ': ' + total(data[key]));
console.log('итого: ' + total(data));

const stock = {};
for (const pair of input().split(' ')) {
  const [name, qty] = pair.split(':');
  stock[name] = Number(qty);
}
const entries = Object.entries(stock);
let max = entries[0];
let min = entries[0];
let total = 0;
for (const e of entries) {
  if (e[1] > max[1]) max = e;
  if (e[1] < min[1]) min = e;
  total += e[1];
}
console.log('больше всего: ' + max[0] + ' (' + max[1] + ')');
console.log('меньше всего: ' + min[0] + ' (' + min[1] + ')');
console.log('всего штук: ' + total);

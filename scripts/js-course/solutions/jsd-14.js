const n = Number(input());
const lines = new Map();
for (let i = 0; i < n; i++) {
  const [name, qty, price] = input().split(' ');
  if (!lines.has(name)) lines.set(name, { qty: 0, price: Number(price) });
  lines.get(name).qty += Number(qty);
}
let total = 0;
let pieces = 0;
for (const [name, { qty, price }] of lines) {
  console.log(name + ' ' + qty + ' шт × ' + price + ' = ' + qty * price);
  total += qty * price;
  pieces += qty;
}
console.log('ИТОГО: ' + total);
console.log('позиций: ' + lines.size);
console.log('штук: ' + pieces);

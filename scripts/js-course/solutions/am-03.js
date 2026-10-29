const n = Number(input());
const items = Array.from({ length: n }, () => {
  const [name, price, qty] = input().split(' ');
  return { name, sum: Number(price) * Number(qty) };
});
items.map((it) => it.name + ': ' + it.sum).forEach((line) => console.log(line));
console.log('Итого: ' + items.reduce((s, it) => s + it.sum, 0));
console.log('Дороже всего: ' + items.reduce((best, it) => (it.sum > best.sum ? it : best)).name);

const names = input().split(' ');
const prices = input().split(' ').map(Number);
const price = {};
names.forEach((n, i) => { price[n] = prices[i]; });
const parts = [];
const missing = [];
let total = 0;
for (const item of input().split(' ')) {
  if (item in price) {
    parts.push(price[item]);
    total += price[item];
  } else missing.push(item);
}
console.log(parts.join(' + ') + ' = ' + total);
if (missing.length) console.log('нет в прайсе: ' + missing.join(', '));

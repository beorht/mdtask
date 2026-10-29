const prices = input().split(' ').map(Number);
const d = Number(input());
const fresh = prices.map((p) => Math.round(p * (100 - d) / 100));
console.log(fresh.join(' '));
console.log(prices.reduce((s, p) => s + p, 0) - fresh.reduce((s, p) => s + p, 0));

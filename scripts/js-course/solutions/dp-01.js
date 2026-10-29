const n = Number(input());
const months = new Map();
for (let i = 0; i < n; i++) {
  const [date, sum] = input().split(' ');
  const m = date.slice(0, 7);
  months.set(m, (months.get(m) || 0) + Number(sum));
}
const list = [...months].sort((a, b) => (a[0] < b[0] ? -1 : 1));
for (const [m, s] of list) console.log(m + ': ' + s);
let best = list[0];
for (const e of list) if (e[1] > best[1]) best = e;
console.log('лучший месяц: ' + best[0]);
for (let i = 1; i < list.length; i++) {
  const p = Math.round((list[i][1] - list[i - 1][1]) / list[i - 1][1] * 100);
  console.log(list[i][0] + ': ' + (p > 0 ? '+' : '') + p + '%');
}

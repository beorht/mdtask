const f = (x) => x * x;
const a = Number(input());
const b = Number(input());
const n = Number(input());
const h = (b - a) / n;
let s = 0;
for (let i = 0; i < n; i++) s += (f(a + i * h) + f(a + (i + 1) * h)) / 2 * h;
console.log(s.toFixed(4));

const k = Number(input());
const f = (x) => x * x * x + x - k;
let a = 0;
let b = k;
let steps = 0;
while (b - a > 1e-7) {
  const m = (a + b) / 2;
  if (f(a) * f(m) <= 0) b = m;
  else a = m;
  steps++;
}
console.log(((a + b) / 2).toFixed(4), steps);

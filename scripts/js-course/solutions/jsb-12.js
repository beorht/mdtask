function sumLoop(n) {
  let s = 0;
  let steps = 0;
  for (let i = 1; i <= n; i++) {
    s += i;
    steps++;
  }
  return [s, steps];
}
function sumFormula(n) {
  return [n * (n + 1) / 2, 1];
}
const n = Number(input());
const a = sumLoop(n);
const b = sumFormula(n);
console.log('цикл: ' + a[0] + ', шагов: ' + a[1]);
console.log('формула: ' + b[0] + ', шагов: ' + b[1]);

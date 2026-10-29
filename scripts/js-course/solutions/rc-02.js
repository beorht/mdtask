let mults = 0;
function power(a, n) {
  if (n === 0) return 1;
  if (n % 2 === 0) {
    const half = power(a, n / 2);
    mults++;
    return half * half;
  }
  mults++;
  return a * power(a, n - 1);
}
const a = Number(input());
const n = Number(input());
console.log(power(a, n), mults);

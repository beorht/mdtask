function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const k = Number(input());
for (let i = 0; i < k; i++) {
  const n = Number(input());
  console.log(n + ': ' + (isPrime(n) ? 'простое' : 'не простое'));
}

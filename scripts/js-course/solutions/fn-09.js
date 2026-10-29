function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
function nextPrime(n) {
  let k = n + 1;
  while (!isPrime(k)) k++;
  return k;
}
const n = Number(input());
let pairs = 0;
for (let p = 2; nextPrime(p) <= n; p = nextPrime(p)) {
  if (nextPrime(p) - p === 2) {
    console.log(p, p + 2);
    pairs++;
  }
}
console.log('пар: ' + pairs);

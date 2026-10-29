function isPrime(n) {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return n > 1;
}
const n = Number(input());
const primes = Array.from({ length: n - 1 }, (_, i) => i + 2).filter(isPrime);
console.log(primes.join(' '));
console.log(primes.length);

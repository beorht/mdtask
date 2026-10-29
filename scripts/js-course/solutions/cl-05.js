let computed = 0;
function divisorSum(n) {
  computed++;
  let s = 0;
  for (let d = 1; d <= n; d++) if (n % d === 0) s += d;
  return s;
}
function memoize(fn) {
  const cache = {};
  return (n) => {
    if (n in cache) return [cache[n], true];
    cache[n] = fn(n);
    return [cache[n], false];
  };
}
const fast = memoize(divisorSum);
while (true) {
  const s = input();
  if (s === 'конец') break;
  const [value, cached] = fast(Number(s));
  console.log(s + ': ' + value + (cached ? ' (из кэша)' : ''));
}
console.log('вычислений: ' + computed);

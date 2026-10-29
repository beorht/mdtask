const n = Number(input());
const prime = new Array(n + 1).fill(true);
prime[0] = false;
prime[1] = false;
for (let p = 2; p * p <= n; p++) {
  if (!prime[p]) continue;
  for (let k = p * p; k <= n; k += p) prime[k] = false;
}
const list = [];
for (let k = 2; k <= n; k++) if (prime[k]) list.push(k);
console.log(list.length);
console.log(list.slice(-5).join(' '));

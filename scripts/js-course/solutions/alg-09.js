const n = Number(input());
let bestK = 1;
let bestC = 1;
for (let k = 2; k <= n; k++) {
  let c = 0;
  for (let d = 1; d * d <= k; d++) if (k % d === 0) c += d * d === k ? 1 : 2;
  if (c > bestC) { bestC = c; bestK = k; }
}
console.log(bestK, bestC);

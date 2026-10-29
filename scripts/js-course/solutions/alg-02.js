const n = Number(input());
let line = '';
for (let k = 2; k <= n; k++) {
  let prime = true;
  for (let d = 2; d * d <= k; d++) if (k % d === 0) { prime = false; break; }
  if (prime) line += k + ' ';
}
console.log(line.trim());

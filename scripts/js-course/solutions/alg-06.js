const n = Number(input());
const found = [];
for (let k = 2; k <= n; k++) {
  let s = 1;
  for (let d = 2; d * d <= k; d++) {
    if (k % d === 0) {
      s += d;
      if (d !== k / d) s += k / d;
    }
  }
  if (s === k) found.push(k);
}
console.log(found.length ? found.join(' ') : 'нет');

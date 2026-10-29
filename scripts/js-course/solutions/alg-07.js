const n = Number(input());
let line = '';
for (let k = 1; k <= n; k++) {
  let len = 0;
  for (let m = k; m > 0; m = Math.floor(m / 10)) len++;
  let s = 0;
  for (let m = k; m > 0; m = Math.floor(m / 10)) s += (m % 10) ** len;
  if (s === k) line += k + ' ';
}
console.log(line.trim());

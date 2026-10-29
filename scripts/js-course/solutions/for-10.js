const n = Number(input());
let line = '';
for (let p = 1; p <= n; p *= 2) line += p + ' ';
console.log(line.trim());

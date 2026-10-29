const n = Number(input());
let line = '';
let count = 0;
for (let d = 1; d <= n; d++) {
  if (n % d === 0) {
    line += d + ' ';
    count++;
  }
}
console.log(line.trim());
console.log(count);

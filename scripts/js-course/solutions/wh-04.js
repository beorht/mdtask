let n = Number(input());
let line = String(n);
let steps = 0;
while (n !== 1) {
  n = n % 2 === 0 ? n / 2 : 3 * n + 1;
  line += ' ' + n;
  steps++;
}
console.log(line);
console.log(steps);

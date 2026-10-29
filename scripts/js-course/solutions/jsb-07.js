const n = Number(input());
let a = 0;
let b = 1;
let line = '';
while (a <= n) {
  line += a + ' ';
  const c = a + b;
  a = b;
  b = c;
}
console.log(line.trim());

let n = Number(input());
let line = String(n);
while (n > 9) {
  let s = 0;
  while (n > 0) { s += n % 10; n = Math.floor(n / 10); }
  n = s;
  line += ' → ' + n;
}
console.log(line);

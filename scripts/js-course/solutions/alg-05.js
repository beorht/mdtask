let n = Number(input());
let d = 2;
let out = '';
while (n > 1) {
  while (n % d === 0) {
    out += (out ? ' * ' : '') + d;
    n /= d;
  }
  d++;
}
console.log(out);

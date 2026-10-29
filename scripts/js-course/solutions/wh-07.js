let n = Number(input());
let bits = '';
while (n > 0) {
  bits = (n % 2) + bits;
  n = Math.floor(n / 2);
}
console.log(bits);

function digitSum(n) {
  let s = 0;
  while (n > 0) {
    s += n % 10;
    n = Math.floor(n / 10);
  }
  return s;
}
function digitalRoot(n) {
  while (n > 9) n = digitSum(n);
  return n;
}
const n = Number(input());
console.log(digitSum(n), digitalRoot(n));

function gcd(a, b) {
  while (b !== 0) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}
function lcm(a, b) {
  return a / gcd(a, b) * b;
}
const a = Number(input());
const b = Number(input());
console.log('НОД = ' + gcd(a, b));
console.log('НОК = ' + lcm(a, b));

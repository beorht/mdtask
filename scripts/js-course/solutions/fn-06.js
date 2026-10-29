function power(base, exp) {
  let r = 1;
  for (let i = 0; i < exp; i++) r *= base;
  return r;
}
const base = Number(input());
const exp = Number(input());
console.log(power(base, exp));

function max2(a, b) {
  return a > b ? a : b;
}
const a = Number(input());
const b = Number(input());
const c = Number(input());
const d = Number(input());
console.log(max2(max2(a, b), max2(c, d)));

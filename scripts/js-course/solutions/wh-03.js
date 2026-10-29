let a = Number(input());
let b = Number(input());
while (b !== 0) {
  const r = a % b;
  a = b;
  b = r;
}
console.log(a);

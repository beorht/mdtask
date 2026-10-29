const a = Number(input());
const b = Number(input());
let x = a;
let y = b;
while (y) { const r = x % y; x = y; y = r; }
console.log(a * b / x);

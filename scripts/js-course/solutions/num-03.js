const n = Number(input());
const a = Math.floor(n / 100);
const b = Math.floor(n / 10) % 10;
const c = n % 10;
console.log(c * 100 + b * 10 + a);

const a = Number(input());
const b = Number(input());
const k = Number(input());
let count = 0;
for (let i = a; i <= b; i++) if (i % k === 0) count++;
console.log(count);

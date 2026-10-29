const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const lo = Number(input());
const hi = Number(input());
const nums = input().split(' ');
let out = '';
for (const s of nums) out += clamp(Number(s), lo, hi) + ' ';
console.log(out.trim());

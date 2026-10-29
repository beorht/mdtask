const a = input().split(' ').map(Number);
const b = input().split(' ').map(Number);
const out = [];
let i = 0;
let j = 0;
while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
while (i < a.length) out.push(a[i++]);
while (j < b.length) out.push(b[j++]);
console.log(out.join(' '));

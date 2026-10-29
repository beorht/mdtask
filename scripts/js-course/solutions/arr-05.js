const a = input().split(' ');
const k = Number(input()) % a.length;
const out = [];
for (let i = 0; i < a.length; i++) out[(i + k) % a.length] = a[i];
console.log(out.join(' '));

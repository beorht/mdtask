const n = Number(input());
const m = Array.from({ length: n }, () => input().split(' ').map(Number));
console.log(m.map((row) => row.reduce((s, x) => s + x, 0)).join(' '));
console.log(m[0].map((_, c) => m.reduce((s, row) => s + row[c], 0)).join(' '));

const n = Number(input());
let a = 0;
for (let i = 1; i <= n; i++) a += i;
let b = 0;
for (let i = 0; i < n; i++) b += i;
console.log(a);
console.log(b);
console.log(Math.max(0, n - 5 + 1));

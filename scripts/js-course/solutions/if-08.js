let a = Number(input());
let b = Number(input());
let c = Number(input());
let t;
if (a > b) { t = a; a = b; b = t; }
if (b > c) { t = b; b = c; c = t; }
if (a > b) { t = a; a = b; b = t; }
console.log(a, b, c);

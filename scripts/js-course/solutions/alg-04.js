const n = Number(input());
let m = n;
let r = 0;
while (m > 0) { r = r * 10 + m % 10; m = Math.floor(m / 10); }
console.log(r === n ? 'да' : 'нет');

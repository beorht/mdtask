const d1 = Number(input()), m1 = Number(input()), y1 = Number(input());
const d2 = Number(input()), m2 = Number(input()), y2 = Number(input());
const a = y1 * 10000 + m1 * 100 + d1;
const b = y2 * 10000 + m2 * 100 + d2;
if (a < b) console.log('первый старше');
else if (a > b) console.log('второй старше');
else console.log('ровесники');

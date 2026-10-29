const x1 = Number(input());
const y1 = Number(input());
const x2 = Number(input());
const y2 = Number(input());
const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
console.log(Math.round(d * 100) / 100);

const a = Number(input());
const b = Number(input());
const c = Number(input());
const d = b * b - 4 * a * c;
const r = (x) => Math.round(x * 100) / 100;
if (d < 0) console.log('корней нет');
else if (d === 0) console.log(r(-b / (2 * a)));
else {
  let x1 = (-b - Math.sqrt(d)) / (2 * a);
  let x2 = (-b + Math.sqrt(d)) / (2 * a);
  if (x1 > x2) { const t = x1; x1 = x2; x2 = t; }
  console.log(r(x1), r(x2));
}

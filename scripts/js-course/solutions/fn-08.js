function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(m, y) {
  if (m === 2) return isLeap(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}
function dayOfYear(d, m, y) {
  let n = d;
  for (let k = 1; k < m; k++) n += daysInMonth(k, y);
  return n;
}
const d = Number(input());
const m = Number(input());
const y = Number(input());
console.log(dayOfYear(d, m, y));

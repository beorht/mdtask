const names = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const d = new Date(input());
let left = Number(input());
while (left > 0) {
  d.setUTCDate(d.getUTCDate() + 1);
  const w = d.getUTCDay();
  if (w !== 0 && w !== 6) left--;
}
const pad = (n) => String(n).padStart(2, '0');
console.log(pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + names[d.getUTCDay()]);

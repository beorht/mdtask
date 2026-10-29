const names = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const pad = (n) => String(n).padStart(2, '0');
let weekend = 0;
while (true) {
  const s = input();
  if (s === 'конец') break;
  const d = new Date(s);
  const w = d.getUTCDay();
  if (w === 0 || w === 6) weekend++;
  console.log(pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' — ' + names[w]);
}
console.log('выходных: ' + weekend);

let sum = 0;
let best = null;
while (true) {
  const s = input();
  if (s === 'стоп') break;
  const x = Number(s);
  if (x <= 0) continue;
  sum += x;
  if (best === null || x > best) best = x;
}
console.log(best === null ? 'нет' : sum + ' ' + best);

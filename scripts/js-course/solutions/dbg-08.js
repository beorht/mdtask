let sum = 0;
let count = 0;
while (true) {
  const s = input();
  if (s === 'конец') break;
  const x = Number(s);
  if (!(x >= 1 && x <= 5)) { console.log('пропущено: ' + s); continue; }
  sum += x;
  count++;
}
console.log(count ? (sum / count).toFixed(2) : 'оценок нет');

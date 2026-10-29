function parseMeasure(s) {
  const x = Number(s);
  if (s.trim() === '' || Number.isNaN(x)) throw new TypeError('не число: ' + s);
  if (x < 0 || x > 1000) throw new RangeError('вне диапазона: ' + s);
  return x;
}
let sum = 0;
let count = 0;
let notNumbers = 0;
let outOfRange = 0;
while (true) {
  const s = input();
  if (s === 'конец') break;
  try {
    sum += parseMeasure(s);
    count++;
  } catch (e) {
    if (e instanceof RangeError) outOfRange++;
    else notNumbers++;
  }
}
console.log(count ? (sum / count).toFixed(2) : 'нет данных');
console.log('не числа: ' + notNumbers + ', вне диапазона: ' + outOfRange);

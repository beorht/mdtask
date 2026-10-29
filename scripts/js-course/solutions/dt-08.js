const y = Number(input());
const m = Number(input());
const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
console.log('Пн Вт Ср Чт Пт Сб Вс');
let row = new Array(first).fill('  ');
for (let d = 1; d <= days; d++) {
  row.push(String(d).padStart(2));
  if (row.length === 7) {
    console.log(row.join(' '));
    row = [];
  }
}
if (row.length) console.log(row.join(' ').trimEnd());

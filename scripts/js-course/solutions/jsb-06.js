const m = Number(input());
const d = Number(input());
let season;
switch (m) {
  case 12: case 1: case 2: season = 'Зима'; break;
  case 3: case 4: case 5: season = 'Весна'; break;
  case 6: case 7: case 8: season = 'Лето'; break;
  default: season = 'Осень';
}
console.log(season + ', ' + (d >= 6 ? 'выходной' : 'рабочий'));

const start = Number(input());
const p = Number(input());
let sum = start;
let years = 0;
while (sum < start * 2) {
  sum += sum * p / 100;
  years++;
}
console.log(years);

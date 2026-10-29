let sum = 0;
let count = 0;
let x = Number(input());
while (x !== 0) {
  sum += x;
  count++;
  x = Number(input());
}
console.log(sum, count);

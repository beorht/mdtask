const a = input().split(' ').map(Number);
let sum = 0;
let min = a[0];
let max = a[0];
for (let i = 0; i < a.length; i++) {
  sum += a[i];
  if (a[i] < min) min = a[i];
  if (a[i] > max) max = a[i];
}
console.log(sum, min, max);

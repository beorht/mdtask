const a = input().split(' ').map(Number);
const target = Number(input());
let count = 0;
for (let i = 0; i < a.length; i++) {
  for (let j = i + 1; j < a.length; j++) {
    if (a[i] + a[j] === target) {
      console.log(a[i] + ' + ' + a[j]);
      count++;
    }
  }
}
console.log('пар: ' + count);

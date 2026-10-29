const a = input().split(' ').map(Number);
let shifts = 0;
for (let i = 1; i < a.length; i++) {
  const cur = a[i];
  let j = i - 1;
  while (j >= 0 && a[j] > cur) {
    a[j + 1] = a[j];
    j--;
    shifts++;
  }
  a[j + 1] = cur;
}
console.log(a.join(' '));
console.log('сдвигов: ' + shifts);

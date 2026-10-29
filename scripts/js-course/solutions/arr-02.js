const a = input().split(' ');
for (let i = 0, j = a.length - 1; i < j; i++, j--) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}
console.log(a.join(' '));

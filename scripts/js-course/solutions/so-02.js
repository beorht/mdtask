const a = input().split(' ').map(Number);
for (let i = 0; i < a.length - 1; i++) {
  let min = i;
  for (let j = i + 1; j < a.length; j++) if (a[j] < a[min]) min = j;
  if (min !== i) {
    [a[i], a[min]] = [a[min], a[i]];
    console.log(a.join(' '));
  }
}

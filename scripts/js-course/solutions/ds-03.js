function minMax(arr) {
  let min = arr[0];
  let max = arr[0];
  for (const x of arr) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return [min, max];
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [min, max] = minMax(line.split(' ').map(Number));
  console.log('min ' + min + ' max ' + max + ' размах ' + (max - min));
}

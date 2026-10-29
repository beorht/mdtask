function stats(numbers) {
  let min = numbers[0];
  let max = numbers[0];
  let sum = 0;
  for (const x of numbers) {
    if (x < min) min = x;
    if (x > max) max = x;
    sum += x;
  }
  const s = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return { min, max, avg: Math.round(sum / numbers.length * 100) / 100, median };
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  console.log(stats(line.split(' ').map(Number)));
}

function average(...nums) {
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const values = [];
  if (line !== '') for (const p of line.split(' ')) values.push(Number(p));
  const avg = average(...values);
  console.log(avg === null ? 'нет данных' : avg.toFixed(2));
}

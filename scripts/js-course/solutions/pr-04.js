function maxAll(first, ...rest) {
  let best = first;
  for (const x of rest) if (x > best) best = x;
  return best;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const values = [];
  for (const p of line.split(' ')) values.push(Number(p));
  console.log(maxAll(...values));
}

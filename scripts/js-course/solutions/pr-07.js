function range(start, end, step = 1) {
  const out = [];
  if (step === 0) return out;
  for (let x = start; step > 0 ? x < end : x > end; x += step) out.push(x);
  return out;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const p = line.split(' ').map(Number);
  const r = range(p[0], p[1], p[2]);
  console.log(r.length ? r.join(' ') : 'пусто');
}

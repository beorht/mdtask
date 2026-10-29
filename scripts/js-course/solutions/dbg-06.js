while (true) {
  const s = input();
  if (s === 'конец') break;
  const n = s.trim() === '' ? NaN : Number(s);
  console.log(Number.isFinite(n) ? 'число' : 'не число');
}

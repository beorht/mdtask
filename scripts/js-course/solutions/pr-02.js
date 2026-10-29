function formatPrice(value, currency = 'сум', digits = 0) {
  return value.toFixed(digits) + ' ' + currency;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const p = line.split(' ');
  console.log(formatPrice(Number(p[0]), p[1], p[2] === undefined ? undefined : Number(p[2])));
}

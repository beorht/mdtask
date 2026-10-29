const conv = {
  'c-f': (v) => v * 9 / 5 + 32,
  'f-c': (v) => (v - 32) * 5 / 9,
  'km-mi': (v) => v / 1.609344,
  'mi-km': (v) => v * 1.609344,
  'kg-lb': (v) => v / 0.45359237,
};
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [name, value] = line.split(' ');
  console.log(conv[name] ? value + ' → ' + conv[name](Number(value)).toFixed(2) : 'нет такого перевода');
}

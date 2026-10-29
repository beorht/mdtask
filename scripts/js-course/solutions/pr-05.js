function repeatText(text, times = 2, sep = ' ') {
  let out = '';
  for (let i = 0; i < times; i++) out += (i ? sep : '') + text;
  return out;
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const p = line.split(';');
  console.log(repeatText(p[0], p[1] === undefined ? undefined : Number(p[1]), p[2]));
}

const obj = {};
while (true) {
  const line = input();
  if (line === '') break;
  const i = line.indexOf(': ');
  const key = line.slice(0, i);
  const raw = line.slice(i + 2);
  let value = raw;
  if (raw === 'да') value = true;
  else if (raw === 'нет') value = false;
  else if (raw.trim() !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
  obj[key] = value;
}
console.log(JSON.stringify(obj));

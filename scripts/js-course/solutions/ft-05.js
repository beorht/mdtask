const key = input();
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [sum, from, to] = line.split(' ');
  const r = await fetch('http://api.edu/rates?base=' + from, { headers: { 'X-API-Key': key } });
  if (r.status === 401) {
    console.log('нужен правильный ключ');
    break;
  }
  if (r.status === 400) {
    console.log('неизвестная валюта ' + from);
    continue;
  }
  const { rates } = await r.json();
  if (!(to in rates)) console.log('нет курса ' + from + ' → ' + to);
  else console.log(sum + ' ' + from + ' = ' + (Number(sum) * rates[to]).toFixed(2) + ' ' + to);
}

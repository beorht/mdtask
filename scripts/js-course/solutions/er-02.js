while (true) {
  const line = input();
  if (line === 'конец') break;
  let v;
  try {
    v = JSON.parse(line);
  } catch (e) {
    console.log('не JSON');
    continue;
  }
  if (Array.isArray(v)) console.log('массив из ' + v.length);
  else if (v === null) console.log('null');
  else if (typeof v === 'object') console.log(Object.keys(v).length ? 'объект с ключами: ' + Object.keys(v).join(', ') : 'пустой объект');
  else console.log({ number: 'число', string: 'строка', boolean: 'логическое' }[typeof v]);
}

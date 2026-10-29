const q = input().split(' ');
while (true) {
  const [cmd, name] = input().split(' ');
  if (cmd === 'конец') break;
  if (cmd === 'next') console.log(q.length ? 'вызван: ' + q.shift() : 'очередь пуста');
  else if (cmd === 'join') q.push(name);
  else if (cmd === 'vip') q.unshift(name);
  else {
    const i = q.indexOf(name);
    console.log(i === -1 ? 'нет в очереди' : i + 1);
  }
}
console.log(q.length ? q.join(' ') : 'пусто');

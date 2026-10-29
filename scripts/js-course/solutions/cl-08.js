function makeHistory(size) {
  const items = [];
  return {
    add: (t) => {
      items.push(t);
      if (items.length > size) items.shift();
    },
    show: () => (items.length ? items.join(' | ') : 'пусто'),
  };
}
const h = makeHistory(Number(input()));
while (true) {
  const line = input();
  if (line === 'конец') break;
  if (line === '?') console.log(h.show());
  else h.add(line.slice(2));
}

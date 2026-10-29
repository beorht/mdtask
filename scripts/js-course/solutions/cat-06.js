const products = JSON.parse(input());
const fmt = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
const print = (list) => list.forEach((p) => console.log(fmt(p)));
const commands = {
  list: () => print(products),
  find: (text) => print(products.filter((p) => p.title.toLowerCase().includes(text.toLowerCase()))),
  cat: (c) => print(products.filter((p) => p.category === c)),
  cheap: (n) => print(products.filter((p) => p.stock > 0).sort((a, b) => a.price - b.price || a.id - b.id).slice(0, Number(n))),
  price: (id, value) => {
    const p = products.find((x) => x.id === Number(id));
    if (!p) console.log('нет товара ' + id);
    else p.price = Number(value);
  },
  stats: () => console.log('товаров ' + products.length + ', средняя цена ' + (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(2)),
};
while (true) {
  const line = input();
  if (line === 'конец') break;
  console.log('> ' + line);
  const [cmd, ...args] = line.split(' ');
  if (commands[cmd]) commands[cmd](...(cmd === 'find' ? [args.join(' ')] : args));
  else console.log('нет такой команды');
}

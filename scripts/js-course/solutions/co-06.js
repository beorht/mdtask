const stock = JSON.parse(input());
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [op, item, n] = line.split(' ');
  const qty = Number(n);
  if (op === '+') stock[item] = (stock[item] || 0) + qty;
  else if ((stock[item] || 0) < qty) console.log('не хватает: ' + item);
  else {
    stock[item] -= qty;
    if (stock[item] === 0) delete stock[item];
  }
}
console.log(JSON.stringify(stock));

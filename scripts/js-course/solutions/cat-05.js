const products = JSON.parse(input());
const byId = new Map(products.map((p) => [p.id, p]));
const cart = new Map();
while (true) {
  const [cmd, idText, nText] = input().split(' ');
  if (cmd === 'конец') break;
  const id = Number(idText);
  if (cmd === 'add') {
    const p = byId.get(id);
    if (!p) {
      console.log('нет товара ' + idText);
      continue;
    }
    const have = cart.get(id) || 0;
    const n = Number(nText);
    if (have + n > p.stock) console.log('можно добавить ещё ' + (p.stock - have));
    else cart.set(id, have + n);
  } else if (cmd === 'del') cart.delete(id);
  else if (!cart.size) console.log('корзина пуста');
  else {
    let total = 0;
    for (const [cid, n] of cart) {
      const p = byId.get(cid);
      console.log(p.title + ' × ' + n + ' = ' + p.price * n);
      total += p.price * n;
    }
    console.log('итого: ' + total);
  }
}

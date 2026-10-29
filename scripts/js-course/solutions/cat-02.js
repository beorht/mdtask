const products = JSON.parse(input());
const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
const search = (list, query) => list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
while (true) {
  const q = input();
  if (q === 'конец') break;
  const found = search(products, q);
  console.log(q + ': ' + found.length);
  found.forEach((p) => console.log(formatProduct(p)));
}

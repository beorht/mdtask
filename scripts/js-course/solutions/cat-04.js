const products = JSON.parse(input());
const groups = new Map();
for (const p of products) {
  if (!groups.has(p.category)) groups.set(p.category, []);
  groups.get(p.category).push(p);
}
for (const cat of [...groups.keys()].sort()) {
  const list = groups.get(cat);
  const avg = list.reduce((s, p) => s + p.price, 0) / list.length;
  const value = list.reduce((s, p) => s + p.price * p.stock, 0);
  console.log(cat + ': товаров ' + list.length + ', в наличии ' + list.filter((p) => p.stock > 0).length + ', средняя цена ' + avg.toFixed(1) + ', стоимость склада ' + value);
}

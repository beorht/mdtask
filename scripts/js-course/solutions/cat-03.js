const products = JSON.parse(input());
const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
const [cat, min, max, order] = input().split(' ');
const dir = order === 'дешевле' ? 1 : -1;
const list = products
  .filter((p) => (cat === 'все' || p.category === cat) && p.price >= Number(min) && p.price <= Number(max))
  .sort((a, b) => dir * (a.price - b.price) || a.id - b.id);
if (!list.length) console.log('ничего не найдено');
list.forEach((p) => console.log(formatProduct(p)));

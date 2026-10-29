const products = JSON.parse(input());
const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
products.forEach((p) => console.log(formatProduct(p)));
console.log('товаров: ' + products.length + ', в наличии: ' + products.filter((p) => p.stock > 0).length);

const { id, customer: { name, phone }, items } = JSON.parse(input());
console.log('Заказ №' + id + ' для ' + name + ' (' + phone + ')');
let total = 0;
for (const { title, price, qty } of items) {
  console.log(title + ' × ' + qty + ' = ' + price * qty);
  total += price * qty;
}
console.log('Итого: ' + total);

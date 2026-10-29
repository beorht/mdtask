function checkQty(q) {
  if (!Number.isInteger(q) || q <= 0) throw new Error('количество должно быть целым больше нуля');
}
function processOrder(line) {
  let order;
  try {
    order = JSON.parse(line);
  } catch (e) {
    throw new Error('битая строка');
  }
  checkQty(order.qty);
  return order.item + ' × ' + order.qty;
}
let n = 0;
while (true) {
  const line = input();
  if (line === 'конец') break;
  n++;
  try {
    console.log('заказ ' + n + ': ' + processOrder(line));
  } catch (e) {
    console.log('заказ ' + n + ' отклонён: ' + e.message);
  }
}

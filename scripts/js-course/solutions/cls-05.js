class Cart {
  #items = new Map();
  add(title, price, qty = 1) {
    const it = this.#items.get(title) || { price, qty: 0 };
    it.qty += qty;
    this.#items.set(title, it);
  }
  remove(title) { this.#items.delete(title); }
  get total() {
    let s = 0;
    for (const it of this.#items.values()) s += it.price * it.qty;
    return s;
  }
  get count() {
    let c = 0;
    for (const it of this.#items.values()) c += it.qty;
    return c;
  }
  receipt() {
    return [...this.#items].map(([t, it]) => t + ' × ' + it.qty + ' = ' + it.price * it.qty);
  }
  static discount(total) {
    return Math.round(total * (total >= 5000 ? 0.1 : total >= 2000 ? 0.05 : 0));
  }
}
const cart = new Cart();
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [cmd, title, price, qty] = line.split(' ');
  if (cmd === 'add') cart.add(title, Number(price), qty === undefined ? undefined : Number(qty));
  else if (cmd === 'remove') cart.remove(title);
  else {
    cart.receipt().forEach((r) => console.log(r));
    const d = Cart.discount(cart.total);
    console.log('итого: ' + cart.total + ' (' + cart.count + ' шт.)');
    console.log('скидка: ' + d);
    console.log('к оплате: ' + (cart.total - d));
  }
}

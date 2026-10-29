# Наследование

Класс может **расширять** другой: брать все его поля и методы и добавлять свои.

```js run
class Animal {
  constructor(name) {
    this.name = name;
  }
  describe() {
    return this.name + ' говорит: ' + this.sound();
  }
  sound() {
    return '…';
  }
}
class Cat extends Animal {
  sound() {
    return 'мяу';
  }
}
console.log(new Cat('Мурка').describe());
```

- `extends` — от какого класса наследуем (родитель);
- метод с тем же именем **переопределяет** родительский: `describe` из `Animal` вызывает `sound` того класса, чей это
  объект, — это и есть главный смысл наследования (полиморфизм);
- `super(...)` в конструкторе вызывает конструктор родителя — его нужно вызвать **до** обращения к `this`;
- `super.метод()` — вызвать родительскую версию метода и дополнить её.

```js run
class Product {
  constructor(title, price) { this.title = title; this.price = price; }
  finalPrice() { return this.price; }
}
class SaleProduct extends Product {
  constructor(title, price, percent) {
    super(title, price);
    this.percent = percent;
  }
  finalPrice() { return super.finalPrice() * (100 - this.percent) / 100; }
}
const goods = [new Product('Чай', 500), new SaleProduct('Торт', 800, 25)];
for (const g of goods) console.log(g.title, g.finalPrice(), g instanceof SaleProduct);
```

## instanceof

`obj instanceof Class` — создан ли объект этим классом **или его наследником**.

## Когда наследовать

Наследование подходит, когда новый класс — **разновидность** старого («товар со скидкой — это товар», «круг — это
фигура»). Если объект просто **использует** другой («у корзины есть товары»), храните его в поле — это проще.

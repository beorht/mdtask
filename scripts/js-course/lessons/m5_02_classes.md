# Классы

**Класс** — шаблон для создания однотипных объектов: какие у них поля и что они умеют.

```js run
class Timer {
  constructor(title, seconds) {
    this.title = title;
    this.seconds = seconds;
  }
  tick() {
    if (this.seconds > 0) this.seconds--;
    return this.seconds;
  }
  isDone() {
    return this.seconds === 0;
  }
}
const tea = new Timer('Чай', 2);
tea.tick();
console.log(tea.title, tea.seconds, tea.isDone());
```

- `constructor` вызывается при `new` и заполняет поля через `this`;
- методы пишутся без слова `function` и доступны у каждого объекта класса;
- имена классов — с заглавной буквы.

## Геттеры и сеттеры

`get` — свойство, которое вычисляется при чтении; `set` — проверка при записи:

```js run
class Circle {
  constructor(r) { this.r = r; }
  get area() { return Math.PI * this.r ** 2; }
  set diameter(d) {
    if (d <= 0) throw new RangeError('диаметр должен быть больше нуля');
    this.r = d / 2;
  }
}
const c = new Circle(1);
c.diameter = 10;
console.log(c.r, c.area.toFixed(2));
```

## Приватные поля и static

`#поле` видно только внутри класса — снаружи его нельзя ни прочитать, ни испортить. `static` — свойство или метод
самого класса, а не объектов (например, счётчик созданных объектов или «фабрика»).

```js run
class Ticket {
  static #issued = 0;
  #code;
  constructor() { this.#code = 'T' + ++Ticket.#issued; }
  get code() { return this.#code; }
  static issued() { return Ticket.#issued; }
}
new Ticket();
console.log(new Ticket().code, Ticket.issued());
```

## Структуры данных

Классы удобны для **структур данных**: стек (последним пришёл — первым ушёл), очередь (первым пришёл — первым ушёл).
Внутри — массив, снаружи — только понятные методы: так структуру нельзя использовать неправильно.

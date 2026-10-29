const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm5/03-inheritance',
  tasks: [
    T('inh-01', 'Фигуры', 'Создайте класс Shape с методами area() и describe() («название: площадь S, периметр P», S и P — две цифры после точки) и наследников Circle (r), Rect (w, h), Square (a, наследник Rect), Triangle (a, b, c, площадь по формуле Герона). Строки «тип параметры» до «конец» (circle 1, rect 2 3, square 4, triangle 3 4 5). Выведите describe каждой фигуры и в конце «наибольшая: название».', () => {
      class Shape {
        constructor(name) { this.name = name; }
        area() { return 0; }
        perimeter() { return 0; }
        describe() { return this.name + ': площадь ' + this.area().toFixed(2) + ', периметр ' + this.perimeter().toFixed(2); }
      }
      class Circle extends Shape {
        constructor(r) { super('круг'); this.r = r; }
        area() { return Math.PI * this.r ** 2; }
        perimeter() { return 2 * Math.PI * this.r; }
      }
      class Rect extends Shape {
        constructor(w, h, name = 'прямоугольник') { super(name); this.w = w; this.h = h; }
        area() { return this.w * this.h; }
        perimeter() { return 2 * (this.w + this.h); }
      }
      class Square extends Rect {
        constructor(a) { super(a, a, 'квадрат'); }
      }
      class Triangle extends Shape {
        constructor(a, b, c) { super('треугольник'); this.s = [a, b, c]; }
        perimeter() { return this.s[0] + this.s[1] + this.s[2]; }
        area() {
          const p = this.perimeter() / 2;
          return Math.sqrt(p * (p - this.s[0]) * (p - this.s[1]) * (p - this.s[2]));
        }
      }
      const make = { circle: Circle, rect: Rect, square: Square, triangle: Triangle };
      const shapes = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [type, ...args] = line.split(' ');
        shapes.push(new make[type](...args.map(Number)));
      }
      shapes.forEach((s) => console.log(s.describe()));
      console.log('наибольшая: ' + shapes.reduce((b, s) => (s.area() > b.area() ? s : b)).name);
    }, [['circle 1', 'rect 2 3', 'square 4', 'triangle 3 4 5', 'конец'], ['triangle 2 2 2', 'circle 0.5', 'конец']], { require: ['class:Shape', 'extends', 'super'] }),
    T('inh-02', 'Сотрудники', 'Класс Employee (имя, оклад) с методом pay(); наследники Manager (+ бонус), Intern (половина оклада), Contractor (часы × ставка, без оклада — конструктор (имя, часы, ставка)). Метод role() у каждого — «сотрудник», «менеджер», «стажёр», «подрядчик». Строки «роль имя числа…» до «конец». Выведите «имя (роль): выплата», затем «фонд: S» и по ролям «роль: K» (в порядке первого появления).', () => {
      class Employee {
        constructor(name, salary) { this.name = name; this.salary = salary; }
        pay() { return this.salary; }
        role() { return 'сотрудник'; }
      }
      class Manager extends Employee {
        constructor(name, salary, bonus) { super(name, salary); this.bonus = bonus; }
        pay() { return super.pay() + this.bonus; }
        role() { return 'менеджер'; }
      }
      class Intern extends Employee {
        pay() { return super.pay() / 2; }
        role() { return 'стажёр'; }
      }
      class Contractor extends Employee {
        constructor(name, hours, rate) { super(name, 0); this.hours = hours; this.rate = rate; }
        pay() { return this.hours * this.rate; }
        role() { return 'подрядчик'; }
      }
      const types = { employee: Employee, manager: Manager, intern: Intern, contractor: Contractor };
      const staff = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [type, name, ...nums] = line.split(' ');
        staff.push(new types[type](name, ...nums.map(Number)));
      }
      const roles = new Map();
      let fund = 0;
      for (const s of staff) {
        console.log(s.name + ' (' + s.role() + '): ' + s.pay());
        fund += s.pay();
        roles.set(s.role(), (roles.get(s.role()) || 0) + 1);
      }
      console.log('фонд: ' + fund);
      for (const [r, k] of roles) console.log(r + ': ' + k);
    }, [['employee Аня 5000', 'manager Бек 7000 2000', 'intern Лола 3000', 'contractor Дима 40 150', 'employee Ира 5500', 'конец'], ['manager Оля 10000 0', 'intern Петя 1000', 'конец']], { require: ['extends', 'super'] }),
    T('inh-03', 'Животные', 'Класс Animal (имя) с методами sound() и describe() («имя: звук»), а также move() — «ходит». Наследники: Dog («гав»), Cat («мяу»), Bird («чирик», move — «летает»), Fish (звук «…», move — «плавает»). Строки «вид имя» до «конец». Выведите для каждого «имя: звук, движение», затем сколько животных каждого способа движения — «ходит: N», «летает: N», «плавает: N» (только ненулевые).', () => {
      class Animal {
        constructor(name) { this.name = name; }
        sound() { return '…'; }
        move() { return 'ходит'; }
        describe() { return this.name + ': ' + this.sound() + ', ' + this.move(); }
      }
      class Dog extends Animal { sound() { return 'гав'; } }
      class Cat extends Animal { sound() { return 'мяу'; } }
      class Bird extends Animal {
        sound() { return 'чирик'; }
        move() { return 'летает'; }
      }
      class Fish extends Animal { move() { return 'плавает'; } }
      const kinds = { собака: Dog, кошка: Cat, птица: Bird, рыба: Fish };
      const count = { ходит: 0, летает: 0, плавает: 0 };
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [kind, name] = line.split(' ');
        const a = new kinds[kind](name);
        console.log(a.describe());
        count[a.move()]++;
      }
      for (const [m, n] of Object.entries(count)) if (n) console.log(m + ': ' + n);
    }, [['собака Шарик', 'кошка Мурка', 'птица Кеша', 'рыба Немо', 'собака Бобик', 'конец'], ['кошка Барсик', 'конец']], { require: ['extends'] }),
    T('inh-04', 'Уведомления', 'Класс Notification (текст) с методом send() → строка; наследники EmailNotification (адрес; «письмо на адрес: текст»), SmsNotification (телефон; текст обрезается до 20 символов + «…», если длиннее: «смс на телефон: текст»), PushNotification («push: текст», а при пометке urgent — с префиксом «[!] » через super.send()). Строки JSON { type, text, to?, urgent? } до «конец». Выведите send() для каждой и «писем: N, смс: M, push: K» через instanceof.', () => {
      class Notification {
        constructor(text) { this.text = text; }
        send() { return this.text; }
      }
      class EmailNotification extends Notification {
        constructor(text, to) { super(text); this.to = to; }
        send() { return 'письмо на ' + this.to + ': ' + super.send(); }
      }
      class SmsNotification extends Notification {
        constructor(text, to) { super(text); this.to = to; }
        send() {
          const t = this.text.length > 20 ? this.text.slice(0, 20) + '…' : this.text;
          return 'смс на ' + this.to + ': ' + t;
        }
      }
      class PushNotification extends Notification {
        constructor(text, urgent = false) { super(text); this.urgent = urgent; }
        send() { return (this.urgent ? '[!] ' : '') + 'push: ' + super.send(); }
      }
      const all = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const n = JSON.parse(line);
        if (n.type === 'email') all.push(new EmailNotification(n.text, n.to));
        else if (n.type === 'sms') all.push(new SmsNotification(n.text, n.to));
        else all.push(new PushNotification(n.text, n.urgent));
      }
      all.forEach((n) => console.log(n.send()));
      const count = (C) => all.filter((n) => n instanceof C).length;
      console.log('писем: ' + count(EmailNotification) + ', смс: ' + count(SmsNotification) + ', push: ' + count(PushNotification));
    }, [['{"type":"email","text":"Ваш заказ отправлен","to":"anna@mail.ru"}', '{"type":"sms","text":"Код подтверждения 4815 действует 5 минут","to":"+998901234567"}', '{"type":"push","text":"Новое сообщение"}', '{"type":"push","text":"Сервер недоступен","urgent":true}', 'конец'], ['{"type":"sms","text":"Коротко","to":"112"}', '{"type":"email","text":"Привет","to":"x@y.z"}', 'конец']], { require: ['extends', 'super', 'instanceof'] }),
    T('inh-05', 'Счета с правилами', 'Класс Account (владелец, баланс) с withdraw(x) — бросает Error «недостаточно средств»; наследники: SavingsAccount — снимать можно не больше 3 раз («лимит снятий»), CreditAccount (лимит L) — баланс может уйти в минус до −L. Дан тип счёта и параметры одной строкой («savings Аня 1000», «credit Бек 100 500», «basic Лола 50»), затем суммы снятия до «конец». Выведите после каждого снятия баланс или «отказ: причина».', () => {
      class Account {
        constructor(owner, balance) { this.owner = owner; this.balance = balance; }
        canWithdraw(x) { return x <= this.balance; }
        withdraw(x) {
          if (!this.canWithdraw(x)) throw new Error('недостаточно средств');
          this.balance -= x;
        }
      }
      class SavingsAccount extends Account {
        #count = 0;
        withdraw(x) {
          if (this.#count >= 3) throw new Error('лимит снятий');
          super.withdraw(x);
          this.#count++;
        }
      }
      class CreditAccount extends Account {
        constructor(owner, balance, limit) { super(owner, balance); this.limit = limit; }
        canWithdraw(x) { return this.balance - x >= -this.limit; }
      }
      const [type, owner, ...nums] = input().split(' ');
      const types = { basic: Account, savings: SavingsAccount, credit: CreditAccount };
      const acc = new types[type](owner, ...nums.map(Number));
      while (true) {
        const s = input();
        if (s === 'конец') break;
        try {
          acc.withdraw(Number(s));
          console.log(acc.balance);
        } catch (e) {
          console.log('отказ: ' + e.message);
        }
      }
    }, [['savings Аня 1000', '100', '2000', '100', '100', '100', 'конец'], ['credit Бек 100 500', '300', '300', '1', 'конец'], ['basic Лола 50', '50', '1', 'конец']], { require: ['extends', 'super'] }),
    T('inh-06', 'Элементы формы', 'Класс Field (имя, значение) с методом validate() — массив ошибок (пустое значение — «обязательное поле»). Наследники: NumberField (min, max: «не число» / «от min до max»), EmailField («нет @»), PasswordField (минимум 8 символов и хотя бы одна цифра: «короткий пароль», «нужна цифра»). Наследники сначала берут ошибки super.validate() и, если их нет, добавляют свои. Даны строки «тип;имя;значение[;min;max]» до «конец». Выведите «имя: ок» или «имя: ошибка1, ошибка2»; в конце — «форма верна» или «ошибок: N».', () => {
      class Field {
        constructor(name, value) { this.name = name; this.value = value; }
        validate() { return this.value === '' ? ['обязательное поле'] : []; }
      }
      class NumberField extends Field {
        constructor(name, value, min, max) { super(name, value); this.min = Number(min); this.max = Number(max); }
        validate() {
          const errors = super.validate();
          if (errors.length) return errors;
          const x = Number(this.value);
          if (Number.isNaN(x)) return ['не число'];
          return x < this.min || x > this.max ? ['от ' + this.min + ' до ' + this.max] : [];
        }
      }
      class EmailField extends Field {
        validate() {
          const errors = super.validate();
          return errors.length || this.value.includes('@') ? errors : ['нет @'];
        }
      }
      class PasswordField extends Field {
        validate() {
          const errors = super.validate();
          if (errors.length) return errors;
          if (this.value.length < 8) errors.push('короткий пароль');
          if (!/[0-9]/.test(this.value)) errors.push('нужна цифра');
          return errors;
        }
      }
      const types = { text: Field, number: NumberField, email: EmailField, password: PasswordField };
      let total = 0;
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [type, ...args] = line.split(';');
        const errors = new types[type](...args).validate();
        total += errors.length;
        console.log(args[0] + ': ' + (errors.length ? errors.join(', ') : 'ок'));
      }
      console.log(total ? 'ошибок: ' + total : 'форма верна');
    }, [['text;имя;Аня', 'number;возраст;12;14;99', 'email;почта;anna.mail.ru', 'password;пароль;qwerty', 'number;рост;;100;250', 'конец'], ['text;имя;Бек', 'password;пароль;secret2026', 'конец']], { require: ['extends', 'super'] }),
  ],
};

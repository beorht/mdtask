const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm5/02-classes',
  tasks: [
    T('cls-01', 'Счёт в банке', 'Напишите класс BankAccount: конструктор (владелец, начальный баланс), методы deposit(x), withdraw(x) (бросает Error «недостаточно средств»), геттер balance и метод history() — массив операций «+x» / «-x». Баланс храните в приватном поле #balance. Дан владелец, баланс и команды «+ x», «- x», «?» до «конец»; на «?» — «владелец: баланс»; ошибки выводите «ошибка: …». В конце — история через пробел.', () => {
      class BankAccount {
        #balance;
        #history = [];
        constructor(owner, balance) {
          this.owner = owner;
          this.#balance = balance;
        }
        deposit(x) {
          this.#balance += x;
          this.#history.push('+' + x);
        }
        withdraw(x) {
          if (x > this.#balance) throw new Error('недостаточно средств');
          this.#balance -= x;
          this.#history.push('-' + x);
        }
        get balance() {
          return this.#balance;
        }
        history() {
          return [...this.#history];
        }
      }
      const acc = new BankAccount(input(), Number(input()));
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [op, x] = line.split(' ');
        try {
          if (op === '+') acc.deposit(Number(x));
          else if (op === '-') acc.withdraw(Number(x));
          else console.log(acc.owner + ': ' + acc.balance);
        } catch (e) {
          console.log('ошибка: ' + e.message);
        }
      }
      console.log(acc.history().join(' '));
    }, [['Аня', '100', '+ 50', '- 30', '?', '- 500', '+ 1', '?', 'конец'], ['Бек', '0', '- 1', '+ 10', '- 10', '?', 'конец']], { require: ['class:BankAccount', '#balance'] }),
    T('cls-02', 'Стек и выражение', 'Напишите класс Stack (push, pop, peek, isEmpty, size). С его помощью вычислите выражение в обратной польской записи: числа и знаки + - * / через пробел; число — в стек, знак — достать два числа, применить, положить результат. Строки до «конец»: выведите результат или «ошибка», если чисел не хватило или в конце в стеке не одно число.', () => {
      class Stack {
        #items = [];
        push(x) { this.#items.push(x); }
        pop() { return this.#items.pop(); }
        peek() { return this.#items[this.#items.length - 1]; }
        isEmpty() { return this.#items.length === 0; }
        size() { return this.#items.length; }
      }
      const ops = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const st = new Stack();
        let ok = true;
        for (const tok of line.split(' ')) {
          if (tok in ops) {
            if (st.size() < 2) { ok = false; break; }
            const b = st.pop();
            const a = st.pop();
            st.push(ops[tok](a, b));
          } else st.push(Number(tok));
        }
        console.log(ok && st.size() === 1 ? st.peek() : 'ошибка');
      }
    }, [['3 4 +', '5 1 2 + 4 * + 3 -', '2 3 4', '1 +', '10 4 /', 'конец'], ['2 3 * 4 +', '7 2 - 3 *', '+', 'конец']], { require: ['class:Stack'] }),
    T('cls-03', 'Очередь в поликлинике', 'Напишите класс Queue с методами enqueue, dequeue, front, size. Пациенты: обычные встают в общую очередь, «срочные» — в отдельную, которая обслуживается первой. Команды до «конец»: «+ имя», «! имя» (срочный), «next» — вызвать («приём: имя» или «никого нет»), «?» — «в очереди: N (срочных: K)».', () => {
      class Queue {
        #items = [];
        enqueue(x) { this.#items.push(x); }
        dequeue() { return this.#items.shift(); }
        front() { return this.#items[0]; }
        size() { return this.#items.length; }
      }
      const normal = new Queue();
      const urgent = new Queue();
      while (true) {
        const line = input();
        if (line === 'конец') break;
        if (line.startsWith('+ ')) normal.enqueue(line.slice(2));
        else if (line.startsWith('! ')) urgent.enqueue(line.slice(2));
        else if (line === 'next') {
          const q = urgent.size() ? urgent : normal;
          console.log(q.size() ? 'приём: ' + q.dequeue() : 'никого нет');
        } else console.log('в очереди: ' + (normal.size() + urgent.size()) + ' (срочных: ' + urgent.size() + ')');
      }
    }, [['+ Аня', '+ Бек', '! Лола', '?', 'next', 'next', '! Дима', 'next', 'next', 'next', '?', 'конец'], ['next', '! Оля', '+ Петя', '?', 'next', 'конец']], { require: ['class:Queue'] }),
    T('cls-04', 'Дробь', 'Напишите класс Fraction (числитель, знаменатель): дробь всегда хранится сокращённой (через НОД), знак — в числителе; методы add(f), sub(f), mul(f), div(f) возвращают новую дробь, toString() — «a/b» (или «a», если знаменатель 1). Даны строки «a/b op c/d» до «конец» — выведите результат.', () => {
      const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
      class Fraction {
        constructor(n, d) {
          if (d === 0) throw new RangeError('знаменатель 0');
          if (d < 0) { n = -n; d = -d; }
          const g = gcd(n, d) || 1;
          this.n = n / g;
          this.d = d / g;
        }
        add(f) { return new Fraction(this.n * f.d + f.n * this.d, this.d * f.d); }
        sub(f) { return new Fraction(this.n * f.d - f.n * this.d, this.d * f.d); }
        mul(f) { return new Fraction(this.n * f.n, this.d * f.d); }
        div(f) { return new Fraction(this.n * f.d, this.d * f.n); }
        toString() { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; }
      }
      const parse = (s) => {
        const [n, d = '1'] = s.split('/');
        return new Fraction(Number(n), Number(d));
      };
      const ops = { '+': 'add', '-': 'sub', '*': 'mul', ':': 'div' };
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [a, op, b] = line.split(' ');
        console.log(parse(a)[ops[op]](parse(b)).toString());
      }
    }, [['1/2 + 1/3', '3/4 - 5/4', '2/3 * 9/4', '1/2 : 1/4', '6/8 + 0/5', '-1/3 * 3', 'конец'], ['1/6 + 1/3', '5/7 : 10/21', '4 - 1/2', 'конец']], { require: ['class:Fraction'] }),
    T('cls-05', 'Корзина-класс', 'Напишите класс Cart: add(title, price, qty = 1) (одинаковые товары складываются), remove(title), геттеры total и count (штук), метод receipt() — строки «title × qty = сумма». Скидка: статический метод Cart.discount(total) — 10% от 5000, 5% от 2000, иначе 0 (целым числом, Math.round). Команды до «конец»: «add название цена [кол-во]», «remove название», «чек» — вывести receipt, «итого: total», «скидка: …», «к оплате: …».', () => {
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
    }, [['add чай 1200 2', 'add торт 450', 'чек', 'add чай 1200', 'add сок 300 3', 'remove торт', 'чек', 'конец'], ['add книга 3000', 'чек', 'add ручка 100 25', 'чек', 'конец']], { require: ['class:Cart', 'static', 'get'] }),
    T('cls-06', 'Температура с сеттером', 'Напишите класс Temperature с приватным полем #celsius, геттерами/сеттерами celsius и fahrenheit (F = C × 9/5 + 32). Сеттеры бросают RangeError «ниже абсолютного нуля», если температура ниже −273.15 °C. Команды до «конец»: «C значение» или «F значение» — установить; «?» — вывести «C: x, F: y» (обе с одним знаком). Ошибки — «ошибка: …», значение при этом не меняется. Начальное значение — 0 °C.', () => {
      class Temperature {
        #celsius = 0;
        get celsius() { return this.#celsius; }
        set celsius(c) {
          if (c < -273.15) throw new RangeError('ниже абсолютного нуля');
          this.#celsius = c;
        }
        get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
        set fahrenheit(f) { this.celsius = (f - 32) * 5 / 9; }
      }
      const t = new Temperature();
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [k, v] = line.split(' ');
        try {
          if (k === 'C') t.celsius = Number(v);
          else if (k === 'F') t.fahrenheit = Number(v);
          else console.log('C: ' + t.celsius.toFixed(1) + ', F: ' + t.fahrenheit.toFixed(1));
        } catch (e) {
          console.log('ошибка: ' + e.message);
        }
      }
    }, [['?', 'C 36.6', '?', 'F 212', '?', 'C -300', 'F -500', '?', 'конец'], ['F 32', '?', 'C -273.15', '?', 'конец']], { require: ['class:Temperature', 'set', 'get'] }),
    T('cls-07', 'Вектор', 'Напишите класс Vector (x, y): add(v), sub(v), scale(k) — новые векторы; dot(v) — скалярное произведение; геттер length; static fromString(«x,y»). Дано N, затем N векторов «x,y». Выведите их сумму «(x, y)», длину суммы (две цифры после точки), вектор наибольшей длины (первый при равенстве) и пары перпендикулярных векторов «i j» (номера с 1, dot = 0) или «перпендикулярных нет».', () => {
      class Vector {
        constructor(x, y) { this.x = x; this.y = y; }
        add(v) { return new Vector(this.x + v.x, this.y + v.y); }
        sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
        scale(k) { return new Vector(this.x * k, this.y * k); }
        dot(v) { return this.x * v.x + this.y * v.y; }
        get length() { return Math.hypot(this.x, this.y); }
        toString() { return '(' + this.x + ', ' + this.y + ')'; }
        static fromString(s) {
          const [x, y] = s.split(',').map(Number);
          return new Vector(x, y);
        }
      }
      const n = Number(input());
      const vs = Array.from({ length: n }, () => Vector.fromString(input()));
      const sum = vs.reduce((a, v) => a.add(v), new Vector(0, 0));
      console.log(sum.toString());
      console.log(sum.length.toFixed(2));
      console.log(vs.reduce((b, v) => (v.length > b.length ? v : b)).toString());
      let any = false;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (vs[i].dot(vs[j]) === 0) { console.log(i + 1, j + 1); any = true; }
      if (!any) console.log('перпендикулярных нет');
    }, [['4', '3,4', '-4,3', '1,0', '0,-2'], ['2', '1,1', '2,2']], { require: ['class:Vector', 'static'] }),
    T('cls-08', 'Номера билетов', 'Напишите класс Ticket: у каждого билета номер вида «A-001» (буква зала + номер по порядку внутри этого зала, три цифры), статический приватный объект-счётчик по залам и статический метод Ticket.total() — сколько билетов выдано всего. Вводятся буквы залов до «конец» — для каждой создайте билет и выведите номер. В конце — «всего: N» через Ticket.total().', () => {
      class Ticket {
        static #counters = {};
        static #total = 0;
        constructor(hall) {
          Ticket.#counters[hall] = (Ticket.#counters[hall] || 0) + 1;
          Ticket.#total++;
          this.code = hall + '-' + String(Ticket.#counters[hall]).padStart(3, '0');
        }
        static total() { return Ticket.#total; }
      }
      while (true) {
        const hall = input();
        if (hall === 'конец') break;
        console.log(new Ticket(hall).code);
      }
      console.log('всего: ' + Ticket.total());
    }, [['A', 'A', 'B', 'A', 'C', 'B', 'конец'], ['Z', 'конец']], { require: ['class:Ticket', 'static'] }),
  ],
};

const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm5/01-errors',
  tasks: [
    T('er-01', 'Безопасное деление', 'Напишите функцию divide(a, b), которая бросает Error с сообщением «деление на ноль», если b = 0, и TypeError «не число», если a или b — NaN. Вводятся строки «a b» до «конец». Выведите результат или «ошибка: сообщение» (ловите try/catch).', () => {
      function divide(a, b) {
        if (Number.isNaN(a) || Number.isNaN(b)) throw new TypeError('не число');
        if (b === 0) throw new Error('деление на ноль');
        return a / b;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [a, b] = line.split(' ').map(Number);
        try {
          console.log(divide(a, b));
        } catch (e) {
          console.log('ошибка: ' + e.message);
        }
      }
    }, [['10 4', '1 0', 'x 2', '-9 3', 'конец'], ['0 5', '7 0', '1.5 0.5', 'конец']], { require: ['def:divide', 'throw', 'try'] }),
    T('er-02', 'Разбор JSON с проверкой', 'Вводятся строки до «конец». Попробуйте разобрать каждую JSON.parse. Если не получилось — «не JSON»; если получилось — выведите тип: «массив из N», «объект с ключами: k1, k2» (или «пустой объект»), «число», «строка», «логическое» или «null».', () => {
      while (true) {
        const line = input();
        if (line === 'конец') break;
        let v;
        try {
          v = JSON.parse(line);
        } catch (e) {
          console.log('не JSON');
          continue;
        }
        if (Array.isArray(v)) console.log('массив из ' + v.length);
        else if (v === null) console.log('null');
        else if (typeof v === 'object') console.log(Object.keys(v).length ? 'объект с ключами: ' + Object.keys(v).join(', ') : 'пустой объект');
        else console.log({ number: 'число', string: 'строка', boolean: 'логическое' }[typeof v]);
      }
    }, [['[1,2,3]', '{"a":1,"b":2}', "{'a':1}", '42', '"текст"', 'true', 'null', '{}', 'привет', 'конец'], ['[]', '{"x":{"y":1}}', '[1,', 'конец']], { require: ['try', 'JSON.parse'] }),
    T('er-03', 'Валидация анкеты', 'Напишите validate(form) — бросает Error с сообщением о первой проблеме: «нет имени» (пустое имя), «возраст — не число», «возраст от 14 до 99», «неверная почта» (нет @ или после @ нет точки). Вводятся анкеты JSON до «конец»; для каждой выведите «ок: имя» или «ошибка: сообщение».', () => {
      function validate(form) {
        if (!form.name || !form.name.trim()) throw new Error('нет имени');
        const age = Number(form.age);
        if (!Number.isFinite(age)) throw new Error('возраст — не число');
        if (age < 14 || age > 99) throw new Error('возраст от 14 до 99');
        const at = String(form.email || '').indexOf('@');
        if (at < 1 || !form.email.slice(at + 1).includes('.')) throw new Error('неверная почта');
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const form = JSON.parse(line);
        try {
          validate(form);
          console.log('ок: ' + form.name);
        } catch (e) {
          console.log('ошибка: ' + e.message);
        }
      }
    }, [['{"name":"Аня","age":"17","email":"anna@mail.ru"}', '{"name":" ","age":"17","email":"a@b.c"}', '{"name":"Бек","age":"семнадцать","email":"b@mail.ru"}', '{"name":"Лола","age":"12","email":"l@mail.ru"}', '{"name":"Дима","age":"20","email":"dima@mail"}', '{"name":"Ира","age":"30"}', 'конец'], ['{"name":"Оля","age":"99","email":"o@x.uz"}', '{"name":"","age":"20","email":"a@b.c"}', 'конец']], { require: ['def:validate', 'throw', 'try'] }),
    T('er-04', 'Средняя с пропуском брака', 'Вводятся замеры до «конец». Функция parseMeasure(s) бросает RangeError, если число вне 0…1000, и TypeError, если это не число. Посчитайте среднее корректных замеров (две цифры после точки или «нет данных»), а затем выведите «не числа: N, вне диапазона: M» — различая ошибки через instanceof.', () => {
      function parseMeasure(s) {
        const x = Number(s);
        if (s.trim() === '' || Number.isNaN(x)) throw new TypeError('не число: ' + s);
        if (x < 0 || x > 1000) throw new RangeError('вне диапазона: ' + s);
        return x;
      }
      let sum = 0;
      let count = 0;
      let notNumbers = 0;
      let outOfRange = 0;
      while (true) {
        const s = input();
        if (s === 'конец') break;
        try {
          sum += parseMeasure(s);
          count++;
        } catch (e) {
          if (e instanceof RangeError) outOfRange++;
          else notNumbers++;
        }
      }
      console.log(count ? (sum / count).toFixed(2) : 'нет данных');
      console.log('не числа: ' + notNumbers + ', вне диапазона: ' + outOfRange);
    }, [['12.5', 'abc', '-3', '40', '1001', '7.5', 'конец'], ['x', 'конец']], { require: ['def:parseMeasure', 'instanceof'] }),
    T('er-05', 'Всегда finally', 'Обработайте задания из строк до «конец»: каждое — выражение «a op b» (op: + - * /). Функция calc бросает ошибку при делении на ноль и при неизвестной операции. Для каждого задания в try выведите «= результат», в catch — «! сообщение», в finally — увеличьте счётчик обработанных. В конце: «обработано: N, ошибок: M».', () => {
      function calc(a, op, b) {
        if (op === '/' && b === 0) throw new Error('деление на ноль');
        const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
        if (!(op in ops)) throw new Error('неизвестная операция ' + op);
        return ops[op];
      }
      let done = 0;
      let errors = 0;
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [a, op, b] = line.split(' ');
        try {
          console.log('= ' + calc(Number(a), op, Number(b)));
        } catch (e) {
          errors++;
          console.log('! ' + e.message);
        } finally {
          done++;
        }
      }
      console.log('обработано: ' + done + ', ошибок: ' + errors);
    }, [['2 + 2', '5 / 0', '3 ^ 2', '7 * 6', 'конец'], ['10 - 20', '9 / 3', '1 % 2', 'конец']], { require: ['finally', 'throw'] }),
    T('er-06', 'Ошибка уходит наверх', 'Обработайте заказы: каждая строка — JSON { "item": название, "qty": количество }. Функция checkQty(q) бросает Error «количество должно быть целым больше нуля»; функция processOrder(line) разбирает JSON (если не JSON — бросает Error «битая строка») и вызывает checkQty, ничего не ловя. Поймайте ошибки в одном месте — в цикле: выведите «заказ N: item × qty» или «заказ N отклонён: сообщение». Ввод до «конец».', () => {
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
    }, [['{"item":"чай","qty":2}', '{"item":"кофе","qty":0}', 'чай 3', '{"item":"сок","qty":1.5}', '{"item":"торт","qty":1}', 'конец'], ['{"item":"сыр","qty":-1}', '{"item":"хлеб","qty":3}', 'конец']], { require: ['def:checkQty', 'def:processOrder', 'throw'] }),
    T('er-07', 'Скобки и ошибки', 'Напишите checkBrackets(s): проходит по строке со стеком (массив push/pop) и бросает SyntaxError с сообщением «лишняя закрывающая X на позиции P», «ожидалась Y на позиции P, а стоит X» или «не закрыта X» (P — номер символа с 1; X, Y — скобки). Пары: () [] {}. Строки до «конец»: выведите «ок» или текст ошибки.', () => {
      function checkBrackets(s) {
        const pairs = { ')': '(', ']': '[', '}': '{' };
        const close = { '(': ')', '[': ']', '{': '}' };
        const stack = [];
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (ch in close) stack.push(ch);
          else if (ch in pairs) {
            if (!stack.length) throw new SyntaxError('лишняя закрывающая ' + ch + ' на позиции ' + (i + 1));
            const top = stack.pop();
            if (top !== pairs[ch]) throw new SyntaxError('ожидалась ' + close[top] + ' на позиции ' + (i + 1) + ', а стоит ' + ch);
          }
        }
        if (stack.length) throw new SyntaxError('не закрыта ' + stack[stack.length - 1]);
      }
      while (true) {
        const s = input();
        if (s === 'конец') break;
        try {
          checkBrackets(s);
          console.log('ок');
        } catch (e) {
          console.log(e.message);
        }
      }
    }, [['f(a[1], {b: 2})', 'a)', '(]', '{[()]', 'текст без скобок', 'конец'], ['((()))', '[{]}', ')(', 'конец']], { require: ['def:checkBrackets', 'throw', '.pop'] }),
    T('er-08', 'Повтор при сбое', 'Функция-«сервер» отвечает по списку: вводится строка исходов через пробел («ок» или «сбой»); каждый вызов берёт следующий исход и при «сбой» бросает Error «сервер недоступен». Напишите retry(fn, attempts), которая вызывает fn до успеха, но не больше attempts раз, и перебрасывает последнюю ошибку. Дано attempts и количество запросов Q. Для каждого запроса выведите «запрос i: ок с попытки k» или «запрос i: не удалось (сервер недоступен)».', () => {
      const outcomes = input().split(' ');
      let next = 0;
      let tries = 0;
      const server = () => {
        tries++;
        if (outcomes[next++] === 'сбой') throw new Error('сервер недоступен');
        return 'ок';
      };
      function retry(fn, attempts) {
        let last;
        for (let i = 0; i < attempts; i++) {
          try {
            return fn();
          } catch (e) {
            last = e;
          }
        }
        throw last;
      }
      const attempts = Number(input());
      const q = Number(input());
      for (let i = 1; i <= q; i++) {
        tries = 0;
        try {
          console.log('запрос ' + i + ': ' + retry(server, attempts) + ' с попытки ' + tries);
        } catch (e) {
          console.log('запрос ' + i + ': не удалось (' + e.message + ')');
        }
      }
    }, [['ок сбой ок сбой сбой сбой ок', '3', '3'], ['сбой сбой ок', '2', '2']], { require: ['def:retry', 'throw'] }),
  ],
};

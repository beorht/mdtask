const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/06-destructuring',
  tasks: [
    T('jsb-01', 'Обмен через деструктуризацию', 'Даны значения a и b, затем c. Поменяйте местами a и b одной строкой деструктуризацией массива (без третьей переменной), выведите «a = …, b = …». Затем сдвиньте по кругу a, b, c (a получает b, b — c, c — a) тоже одной деструктуризацией и выведите «a b c».', () => {
      let [a, b, c] = [input(), input(), input()];
      [a, b] = [b, a];
      console.log('a = ' + a + ', b = ' + b);
      [a, b, c] = [b, c, a];
      console.log(a, b, c);
    }, [['5', '10', '15'], ['кот', 'пёс', 'ёж']], { require: ['destructuring'] }),
    T('jsd-08', 'Объединение складов', 'Даны два склада — каждый одной строкой пар «товар:количество» через пробел. Соберите один объект «товар → суммарное количество» (одинаковые товары складываются). Перебирайте пары через деструктуризацию. Выведите «товар — N» в порядке первого появления и «итого позиций: K».', () => {
      const total = {};
      for (let s = 0; s < 2; s++) {
        for (const pair of input().split(' ')) {
          const [name, qty] = pair.split(':');
          total[name] = (total[name] || 0) + Number(qty);
        }
      }
      for (const [name, qty] of Object.entries(total)) console.log(name + ' — ' + qty);
      console.log('итого позиций: ' + Object.keys(total).length);
    }, [['яблоко:5 банан:3', 'яблоко:2 киви:7'], ['чай:1', 'чай:1']], { require: ['destructuring'] }),
    T('ds-01', 'Обновление без изменения', 'Дана запись в JSON, затем изменения строками «поле=значение» до «конец» (значения — строки). Создайте новый объект со всеми изменениями через spread, не меняя исходный. Выведите исходный и новый объект через console.log (каждый своей строкой).', () => {
      const original = JSON.parse(input());
      let updated = original;
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [key, value] = line.split('=');
        updated = { ...updated, [key]: value };
      }
      console.log(original);
      console.log(updated);
    }, [['{"name":"Аня","group":"web-1","city":"Ташкент"}', 'group=web-2', 'phone=8901', 'конец'], ['{"id":1}', 'конец']], { require: ['spread'] }),
    T('ds-02', 'Кнопка из настроек', 'Напишите функцию button({ text, color = «серый», size = «M», disabled = false }) с деструктуризацией в параметрах, которая возвращает описание «[size] text (color)» и « — недоступна», если disabled. Вводятся строки JSON с настройками до «конец»; выведите описание для каждой.', () => {
      function button({ text, color = 'серый', size = 'M', disabled = false }) {
        return '[' + size + '] ' + text + ' (' + color + ')' + (disabled ? ' — недоступна' : '');
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        console.log(button(JSON.parse(line)));
      }
    }, [['{"text":"OK"}', '{"text":"Отмена","color":"красный","size":"S"}', '{"text":"Купить","disabled":true}', 'конец'], ['{"text":"Войти","size":"L","color":"синий","disabled":false}', 'конец']], { require: ['def:button', 'destructuring'] }),
    T('ds-03', 'Минимум и максимум парой', 'Напишите функцию minMax(arr), которая за один проход возвращает массив [минимум, максимум] (без Math.min/max и sort). Для каждой строки чисел до «конец» получите результат деструктуризацией и выведите «min … max … размах …».', () => {
      function minMax(arr) {
        let min = arr[0];
        let max = arr[0];
        for (const x of arr) {
          if (x < min) min = x;
          if (x > max) max = x;
        }
        return [min, max];
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [min, max] = minMax(line.split(' ').map(Number));
        console.log('min ' + min + ' max ' + max + ' размах ' + (max - min));
      }
    }, [['3 9 -2 7', '5', '-1 -1', 'конец'], ['10 20', '0', 'конец']], { require: ['def:minMax', 'destructuring'], forbid: ['Math.min', 'Math.max', '.sort'] }),
    T('ds-04', 'Пьедестал', 'Даны участники через пробел в порядке мест. Деструктуризацией с rest достаньте трёх призёров и остальных. Выведите «золото: …», «серебро: …», «бронза: …» (если участника нет — «—») и «остальные: K».', () => {
      const [gold = '—', silver = '—', bronze = '—', ...others] = input().split(' ');
      console.log('золото: ' + gold);
      console.log('серебро: ' + silver);
      console.log('бронза: ' + bronze);
      console.log('остальные: ' + others.length);
    }, [['Аня Бек Лола Дима Ира'], ['Оля Петя']], { require: ['destructuring', 'spread'] }),
    T('ds-05', 'Объединить без повторов', 'Даны три списка чисел, каждый одной строкой. Объедините их spread-ом в один массив, уберите повторы (оставляя первое появление) и отсортируйте по возрастанию. Выведите результат и сколько повторов убрано.', () => {
      const all = [...input().split(' '), ...input().split(' '), ...input().split(' ')].map(Number);
      const unique = [];
      for (const x of all) if (!unique.includes(x)) unique.push(x);
      unique.sort((a, b) => a - b);
      console.log(unique.join(' '));
      console.log(all.length - unique.length);
    }, [['3 1 4', '1 5 9', '2 6 5 3'], ['1', '1', '1']], { require: ['spread'] }),
    T('ds-06', 'Заказ из JSON', 'Дан заказ в JSON: { id, customer: { name, phone }, items: [{ title, price, qty }] }. Достаньте поля вложенной деструктуризацией и выведите «Заказ №id для name (phone)», затем строки «title × qty = сумма» и «Итого: S».', () => {
      const { id, customer: { name, phone }, items } = JSON.parse(input());
      console.log('Заказ №' + id + ' для ' + name + ' (' + phone + ')');
      let total = 0;
      for (const { title, price, qty } of items) {
        console.log(title + ' × ' + qty + ' = ' + price * qty);
        total += price * qty;
      }
      console.log('Итого: ' + total);
    }, [['{"id":17,"customer":{"name":"Аня","phone":"8901"},"items":[{"title":"Чай","price":120,"qty":2},{"title":"Торт","price":450,"qty":1}]}'], ['{"id":1,"customer":{"name":"Бек","phone":"-"},"items":[]}']], { require: ['destructuring'] }),
  ],
};

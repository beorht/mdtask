const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const NO_SHORTCUTS = ['Map', 'Set', '.reduce', 'Object.groupBy'];
module.exports = {
  dir: 'm4/05-objects',
  tasks: [
    T('jsd-01', 'Счётчик повторов', 'Даны слова одной строкой. С помощью объекта посчитайте, сколько раз встречается каждое слово. Выведите «слово — N раз» в порядке первого появления; слово «раз» согласуйте с числом: 2–4 (кроме 12–14) — «раза», иначе — «раз».', () => {
      const count = {};
      for (const w of input().split(' ')) count[w] = (count[w] || 0) + 1;
      for (const w in count) {
        const n = count[w];
        const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
        console.log(w + ' — ' + n + (few ? ' раза' : ' раз'));
      }
    }, [['яблоко груша яблоко банан яблоко'], ['а а а а а а а а а а а а б'], ['кот']], { forbid: NO_SHORTCUTS }),
    T('jsd-02', 'Телефонная книга', 'Даны имена одной строкой и номера одной строкой (в том же порядке). Соберите объект «имя → телефон». Затем вводятся имена до «конец» — для каждого выведите номер или «не найден».', () => {
      const names = input().split(' ');
      const phones = input().split(' ');
      const book = {};
      for (let i = 0; i < names.length; i++) book[names[i]] = phones[i];
      while (true) {
        const q = input();
        if (q === 'конец') break;
        console.log(q in book ? book[q] : 'не найден');
      }
    }, [['Аня Боря Витя', '8901 8902 8903', 'Боря', 'Гена', 'Аня', 'конец'], ['Оля', '+998901112233', 'оля', 'Оля', 'конец']], { forbid: NO_SHORTCUTS }),
    T('jsd-03', 'Прайс-лист и заказ', 'Даны названия товаров одной строкой и их цены одной строкой. Соберите объект «товар → цена». Затем дан заказ — товары через пробел (могут повторяться). Выведите сумму заказа в виде «40 + 350 + 40 = 430»; товары не из прайса пропустите и в конце выведите «нет в прайсе: …» (через запятую с пробелом), если такие были.', () => {
      const names = input().split(' ');
      const prices = input().split(' ').map(Number);
      const price = {};
      names.forEach((n, i) => { price[n] = prices[i]; });
      const parts = [];
      const missing = [];
      let total = 0;
      for (const item of input().split(' ')) {
        if (item in price) {
          parts.push(price[item]);
          total += price[item];
        } else missing.push(item);
      }
      console.log(parts.join(' + ') + ' = ' + total);
      if (missing.length) console.log('нет в прайсе: ' + missing.join(', '));
    }, [['хлеб молоко сыр', '40 70 350', 'хлеб сыр хлеб'], ['чай кофе', '120 300', 'кофе какао чай кофе торт']], { forbid: NO_SHORTCUTS }),
    T('jsd-05', 'Гласные буквы', 'Дана строка текста. Посчитайте в объекте, сколько раз встречается каждая буква (без учёта регистра). Затем выведите только гласные (а е ё и о у ы э ю я, для латиницы — a e i o u y) в порядке первого появления в строке: «буква — N». Если гласных нет — «гласных нет».', () => {
      const count = {};
      for (const ch of input().toLowerCase()) if (ch !== ' ') count[ch] = (count[ch] || 0) + 1;
      let any = false;
      for (const ch in count) {
        if ('аеёиоуыэюяaeiouy'.includes(ch)) {
          console.log(ch + ' — ' + count[ch]);
          any = true;
        }
      }
      if (!any) console.log('гласных нет');
    }, [['привет мир'], ['Hello World'], ['ткнмк ывж']], { forbid: NO_SHORTCUTS }),
    T('jsd-06', 'Шифр подстановки', 'Дан словарь замен одной строкой — пары «буква:замена» через пробел (например, «п:p р:r»), затем строка. Соберите объект и замените каждый символ строки по нему; символы, которых нет в словаре, оставьте как есть. Выведите результат и количество заменённых символов.', () => {
      const map = {};
      for (const pair of input().split(' ')) {
        const [from, to] = pair.split(':');
        map[from] = to;
      }
      let out = '';
      let changed = 0;
      for (const ch of input()) {
        if (ch in map) {
          out += map[ch];
          changed++;
        } else out += ch;
      }
      console.log(out);
      console.log(changed);
    }, [['п:p р:r и:i в:v е:e т:t', 'привет'], ['а:4 е:3 о:0 и:1', 'Привет, как дела у Олега?'], ['x:y', 'нет совпадений']], { forbid: NO_SHORTCUTS }),
    T('jsd-07', 'Обратный словарь', 'Дано N, затем N строк «ключ значение» (разные ключи могут иметь одинаковое значение). Постройте обратный объект «значение → массив ключей». Выведите «значение: ключ1, ключ2» в порядке первого появления значений.', () => {
      const n = Number(input());
      const back = {};
      for (let i = 0; i < n; i++) {
        const [key, value] = input().split(' ');
        if (!back[value]) back[value] = [];
        back[value].push(key);
      }
      for (const v in back) console.log(v + ': ' + back[v].join(', '));
    }, [['3', '1 a', '2 b', '3 a'], ['5', 'Аня web-2', 'Бек ib-2', 'Лола web-2', 'Дима web-1', 'Ира ib-2']], { forbid: NO_SHORTCUTS }),
    T('obj-01', 'Прямоугольник с методами', 'Даны ширина и высота. Создайте объект с полями width, height и методами area(), perimeter(), isSquare(), которые используют this. Затем дано число k — увеличьте ширину и высоту в k раз через метод scale(k) и выведите площадь снова. Выведите четыре строки: площадь, периметр, «квадрат»/«не квадрат», новая площадь.', () => {
      const rect = {
        width: Number(input()),
        height: Number(input()),
        area() { return this.width * this.height; },
        perimeter() { return 2 * (this.width + this.height); },
        isSquare() { return this.width === this.height; },
        scale(k) {
          this.width *= k;
          this.height *= k;
        },
      };
      console.log(rect.area());
      console.log(rect.perimeter());
      console.log(rect.isSquare() ? 'квадрат' : 'не квадрат');
      rect.scale(Number(input()));
      console.log(rect.area());
    }, [['3', '5', '2'], ['4', '4', '0.5']], { require: ['this'] }),
    T('obj-02', 'Склад: больше и меньше всего', 'Дан склад одной строкой — пары «товар:количество» через пробел. Соберите объект. С помощью Object.entries найдите товар с наибольшим и наименьшим количеством (при равенстве — первый). Выведите «больше всего: товар (N)», «меньше всего: товар (N)» и «всего штук: S».', () => {
      const stock = {};
      for (const pair of input().split(' ')) {
        const [name, qty] = pair.split(':');
        stock[name] = Number(qty);
      }
      const entries = Object.entries(stock);
      let max = entries[0];
      let min = entries[0];
      let total = 0;
      for (const e of entries) {
        if (e[1] > max[1]) max = e;
        if (e[1] < min[1]) min = e;
        total += e[1];
      }
      console.log('больше всего: ' + max[0] + ' (' + max[1] + ')');
      console.log('меньше всего: ' + min[0] + ' (' + min[1] + ')');
      console.log('всего штук: ' + total);
    }, [['яблоко:12 банан:30 киви:4 груша:30'], ['вода:1']], { require: ['Object.entries'] }),
    T('obj-03', 'Топ-3 слова', 'Дан текст (слова через пробел, без знаков препинания). Без учёта регистра посчитайте частоту слов объектом и выведите три самых частых: «слово — N». При равной частоте раньше идёт слово, которое встретилось в тексте раньше. Сортировку не используйте — трижды найдите максимум среди ещё не выведенных.', () => {
      const count = {};
      for (const w of input().toLowerCase().split(' ')) count[w] = (count[w] || 0) + 1;
      const used = {};
      for (let k = 0; k < 3; k++) {
        let best = null;
        for (const w in count) if (!used[w] && (best === null || count[w] > count[best])) best = w;
        if (best === null) break;
        used[best] = true;
        console.log(best + ' — ' + count[best]);
      }
    }, [['кот и пёс и кот и мышь пёс'], ['Да да ДА нет'], ['один']], { forbid: ['.sort', ...NO_SHORTCUTS] }),
    T('obj-04', 'Адрес необязателен', 'Дано N, затем N строк профилей в JSON (у профиля может не быть address или address.city). Выведите для каждого «имя: город» или «имя: город не указан», используя ?. и ??. Затем — сколько разных городов указано.', () => {
      const n = Number(input());
      const cities = {};
      for (let i = 0; i < n; i++) {
        const u = JSON.parse(input());
        const city = u.address?.city;
        console.log(u.name + ': ' + (city ?? 'город не указан'));
        if (city) cities[city] = true;
      }
      console.log(Object.keys(cities).length);
    }, [['4', '{"name":"Аня","address":{"city":"Ташкент"}}', '{"name":"Бек"}', '{"name":"Лола","address":{}}', '{"name":"Дима","address":{"city":"Ташкент"}}'], ['2', '{"name":"Ира","address":{"city":"Бухара"}}', '{"name":"Оля","address":{"city":null}}']], { require: ['?.', '??'] }),
  ],
};

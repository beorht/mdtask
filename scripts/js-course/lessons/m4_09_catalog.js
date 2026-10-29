const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const CATALOG = JSON.stringify([
  { id: 1, title: 'Тетрадь в клетку', category: 'канцелярия', price: 15, stock: 120 },
  { id: 2, title: 'Мяч футбольный', category: 'спорт', price: 300, stock: 4 },
  { id: 3, title: 'Ручка синяя', category: 'канцелярия', price: 8, stock: 0 },
  { id: 4, title: 'Скакалка', category: 'спорт', price: 90, stock: 15 },
  { id: 5, title: 'Книга «JavaScript»', category: 'книги', price: 450, stock: 2 },
  { id: 6, title: 'Пенал', category: 'канцелярия', price: 60, stock: 7 },
  { id: 7, title: 'Кеды', category: 'спорт', price: 900, stock: 0 },
]);
const SMALL = JSON.stringify([
  { id: 10, title: 'Чай', category: 'еда', price: 120, stock: 3 },
  { id: 11, title: 'Сахар', category: 'еда', price: 80, stock: 0 },
]);
const FORMAT = 'Строка товара: «#id название — цена (нет в наличии)», где скобки — только если stock = 0.';
module.exports = {
  dir: 'm4/09-catalog',
  tasks: [
    T('cat-01', 'Загрузка и показ', 'Дан каталог — массив товаров { id, title, category, price, stock } строкой JSON. Напишите функцию formatProduct(p) и выведите все товары. ' + FORMAT + ' Последней строкой — «товаров: N, в наличии: K».', () => {
      const products = JSON.parse(input());
      const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
      products.forEach((p) => console.log(formatProduct(p)));
      console.log('товаров: ' + products.length + ', в наличии: ' + products.filter((p) => p.stock > 0).length);
    }, [[CATALOG], [SMALL]], { require: ['def:formatProduct'] }),
    T('cat-02', 'Поиск', 'Дан каталог JSON, затем поисковые запросы до «конец». Напишите функцию search(list, query): товары, в названии которых есть запрос без учёта регистра. Для каждого запроса выведите «запрос: N» и найденные товары. ' + FORMAT, () => {
      const products = JSON.parse(input());
      const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
      const search = (list, query) => list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
      while (true) {
        const q = input();
        if (q === 'конец') break;
        const found = search(products, q);
        console.log(q + ': ' + found.length);
        found.forEach((p) => console.log(formatProduct(p)));
      }
    }, [[CATALOG, 'ру', 'КЕДЫ', 'планшет', 'конец'], [SMALL, 'а', 'конец']], { require: ['def:search'] }),
    T('cat-03', 'Фильтр и сортировка', 'Дан каталог JSON, затем строка параметров «категория мин макс порядок»: категория или «все», цены включительно, порядок «дешевле» или «дороже» (при равной цене — по id). Выведите подходящие товары в этом порядке или «ничего не найдено». ' + FORMAT, () => {
      const products = JSON.parse(input());
      const formatProduct = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
      const [cat, min, max, order] = input().split(' ');
      const dir = order === 'дешевле' ? 1 : -1;
      const list = products
        .filter((p) => (cat === 'все' || p.category === cat) && p.price >= Number(min) && p.price <= Number(max))
        .sort((a, b) => dir * (a.price - b.price) || a.id - b.id);
      if (!list.length) console.log('ничего не найдено');
      list.forEach((p) => console.log(formatProduct(p)));
    }, [[CATALOG, 'все 50 500 дороже'], [CATALOG, 'спорт 0 1000 дешевле'], [CATALOG, 'книги 0 100 дешевле']], { require: ['.filter', '.sort'] }),
    T('cat-04', 'Итоги по категориям', 'Дан каталог JSON. Для каждой категории (по алфавиту, обычное сравнение строк) выведите «категория: товаров N, в наличии K, средняя цена X, стоимость склада S» — X с одной цифрой после точки, S = сумма price × stock.', () => {
      const products = JSON.parse(input());
      const groups = new Map();
      for (const p of products) {
        if (!groups.has(p.category)) groups.set(p.category, []);
        groups.get(p.category).push(p);
      }
      for (const cat of [...groups.keys()].sort()) {
        const list = groups.get(cat);
        const avg = list.reduce((s, p) => s + p.price, 0) / list.length;
        const value = list.reduce((s, p) => s + p.price * p.stock, 0);
        console.log(cat + ': товаров ' + list.length + ', в наличии ' + list.filter((p) => p.stock > 0).length + ', средняя цена ' + avg.toFixed(1) + ', стоимость склада ' + value);
      }
    }, [[CATALOG], [SMALL]]),
    T('cat-05', 'Корзина', 'Дан каталог JSON, затем команды до «конец»: «add id N» — положить N штук (нельзя больше, чем stock минус уже в корзине: тогда «можно добавить ещё K»; неизвестный id — «нет товара id»), «del id» — убрать товар из корзины, «show» — вывести корзину строками «название × N = сумма» в порядке добавления и «итого: S» (пустая — «корзина пуста»).', () => {
      const products = JSON.parse(input());
      const byId = new Map(products.map((p) => [p.id, p]));
      const cart = new Map();
      while (true) {
        const [cmd, idText, nText] = input().split(' ');
        if (cmd === 'конец') break;
        const id = Number(idText);
        if (cmd === 'add') {
          const p = byId.get(id);
          if (!p) {
            console.log('нет товара ' + idText);
            continue;
          }
          const have = cart.get(id) || 0;
          const n = Number(nText);
          if (have + n > p.stock) console.log('можно добавить ещё ' + (p.stock - have));
          else cart.set(id, have + n);
        } else if (cmd === 'del') cart.delete(id);
        else if (!cart.size) console.log('корзина пуста');
        else {
          let total = 0;
          for (const [cid, n] of cart) {
            const p = byId.get(cid);
            console.log(p.title + ' × ' + n + ' = ' + p.price * n);
            total += p.price * n;
          }
          console.log('итого: ' + total);
        }
      }
    }, [[CATALOG, 'show', 'add 2 3', 'add 2 2', 'add 3 1', 'add 6 7', 'add 99 1', 'show', 'del 2', 'show', 'конец'], [SMALL, 'add 11 1', 'add 10 4', 'add 10 3', 'show', 'конец']], { require: ['Map'] }),
    T('cat-06', 'Каталог с командами', 'Соберите каталог целиком. Дан каталог JSON, затем команды до «конец»: «list» — все товары, «find текст» — поиск по названию без учёта регистра, «cat категория» — товары категории, «cheap N» — N самых дешёвых в наличии (при равной цене — по id), «price id новая_цена» — изменить цену («нет товара id»), «stats» — «товаров N, средняя цена X» (X с двумя знаками). Храните команды в объекте «имя → функция»; неизвестная команда — «нет такой команды». Каждую команду предваряйте строкой «> команда». ' + FORMAT, () => {
      const products = JSON.parse(input());
      const fmt = (p) => '#' + p.id + ' ' + p.title + ' — ' + p.price + (p.stock === 0 ? ' (нет в наличии)' : '');
      const print = (list) => list.forEach((p) => console.log(fmt(p)));
      const commands = {
        list: () => print(products),
        find: (text) => print(products.filter((p) => p.title.toLowerCase().includes(text.toLowerCase()))),
        cat: (c) => print(products.filter((p) => p.category === c)),
        cheap: (n) => print(products.filter((p) => p.stock > 0).sort((a, b) => a.price - b.price || a.id - b.id).slice(0, Number(n))),
        price: (id, value) => {
          const p = products.find((x) => x.id === Number(id));
          if (!p) console.log('нет товара ' + id);
          else p.price = Number(value);
        },
        stats: () => console.log('товаров ' + products.length + ', средняя цена ' + (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(2)),
      };
      while (true) {
        const line = input();
        if (line === 'конец') break;
        console.log('> ' + line);
        const [cmd, ...args] = line.split(' ');
        if (commands[cmd]) commands[cmd](...(cmd === 'find' ? [args.join(' ')] : args));
        else console.log('нет такой команды');
      }
    }, [[CATALOG, 'cheap 3', 'find книга', 'price 4 50', 'price 42 1', 'cheap 2', 'cat спорт', 'stats', 'sell 1', 'конец'], [SMALL, 'list', 'find ручка синяя', 'stats', 'конец']]),
  ],
};

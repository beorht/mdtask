const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/07-collections',
  tasks: [
    T('co-01', 'Уникальные значения', 'Даны слова одной строкой. С помощью Set выведите количество разных слов, сами слова в порядке первого появления через пробел и «есть повторы»/«повторов нет».', () => {
      const words = input().split(' ');
      const set = new Set(words);
      console.log(set.size);
      console.log([...set].join(' '));
      console.log(set.size < words.length ? 'есть повторы' : 'повторов нет');
    }, [['кот пёс кот ёж'], ['a b c']], { require: ['Set'] }),
    T('co-02', 'Общие и разные', 'Даны два списка чисел. С помощью Set выведите три строки: общие элементы (в порядке первого списка, без повторов), элементы только первого, элементы только второго (в порядке второго). Пустой результат — «нет».', () => {
      const a = input().split(' ');
      const b = input().split(' ');
      const sa = new Set(a);
      const sb = new Set(b);
      const show = (arr) => (arr.length ? arr.join(' ') : 'нет');
      console.log(show([...sa].filter((x) => sb.has(x))));
      console.log(show([...sa].filter((x) => !sb.has(x))));
      console.log(show([...sb].filter((x) => !sa.has(x))));
    }, [['1 2 3 4 2', '3 4 5 6'], ['7 8', '9'], ['1', '1']], { require: ['Set', '.has'] }),
    T('co-03', 'Самая частая буква', 'Дана строка. С помощью Map посчитайте буквы (без учёта регистра, только буквы — то, у чего toLowerCase() отличается от toUpperCase()). Выведите самую частую букву и её количество (при равенстве — первая встреченная), затем количество разных букв.', () => {
      const m = new Map();
      for (const ch of input().toLowerCase()) if (ch.toLowerCase() !== ch.toUpperCase()) m.set(ch, (m.get(ch) || 0) + 1);
      let best = null;
      for (const [ch, n] of m) if (best === null || n > m.get(best)) best = ch;
      console.log(best + ' ' + m.get(best));
      console.log(m.size);
    }, [['Мама мыла раму'], ['Hello, World!'], ['ё-моё 123']], { require: ['Map'] }),
    T('co-04', 'Товары из JSON', 'Дан массив товаров в JSON: [{ "title", "price", "qty" }]. Разберите JSON.parse. Выведите сумму всех товаров (price × qty), самый дешёвый товар и товары, которых нет в наличии (qty = 0), через запятую с пробелом или «все в наличии».', () => {
      const items = JSON.parse(input());
      console.log(items.reduce((s, it) => s + it.price * it.qty, 0));
      console.log(items.reduce((a, it) => (it.price < a.price ? it : a)).title);
      const out = items.filter((it) => it.qty === 0).map((it) => it.title);
      console.log(out.length ? out.join(', ') : 'все в наличии');
    }, [['[{"title":"Чай","price":120,"qty":3},{"title":"Кофе","price":300,"qty":0},{"title":"Сахар","price":80,"qty":5}]'], ['[{"title":"Вода","price":25,"qty":10}]']], { require: ['JSON.parse'] }),
    T('co-05', 'Анкета в JSON', 'Вводятся строки «поле: значение» до пустой строки. Если значение — число, сохраните его числом; «да»/«нет» — true/false; иначе — строкой. Выведите объект через JSON.stringify одной строкой.', () => {
      const obj = {};
      while (true) {
        const line = input();
        if (line === '') break;
        const i = line.indexOf(': ');
        const key = line.slice(0, i);
        const raw = line.slice(i + 2);
        let value = raw;
        if (raw === 'да') value = true;
        else if (raw === 'нет') value = false;
        else if (raw.trim() !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
        obj[key] = value;
      }
      console.log(JSON.stringify(obj));
    }, [['имя: Аня', 'возраст: 17', 'группа: web-2', 'староста: да', 'рост: 1.65', ''], ['пусто: нет', '']], { require: ['JSON.stringify'] }),
    T('co-06', 'Склад из JSON', 'Дан склад в JSON (объект «товар → количество»), затем операции до «конец»: «+ товар N» — привезли, «- товар N» — продали (если не хватает — «не хватает: товар» и ничего не менять). Товар с количеством 0 удаляйте. В конце выведите склад через JSON.stringify.', () => {
      const stock = JSON.parse(input());
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [op, item, n] = line.split(' ');
        const qty = Number(n);
        if (op === '+') stock[item] = (stock[item] || 0) + qty;
        else if ((stock[item] || 0) < qty) console.log('не хватает: ' + item);
        else {
          stock[item] -= qty;
          if (stock[item] === 0) delete stock[item];
        }
      }
      console.log(JSON.stringify(stock));
    }, [['{"хлеб":5,"сыр":2}', '- хлеб 2', '+ молоко 4', '- сыр 3', '- сыр 2', 'конец'], ['{}', '- чай 1', '+ чай 1', 'конец']], { require: ['JSON.parse', 'JSON.stringify'] }),
    T('jsd-13', 'Самая длинная цепочка', 'Дан маршрут в JSON — объект «пункт → следующий пункт». Цепочка из каждого пункта-ключа идёт по переходам и заканчивается, когда следующего пункта нет среди ключей или он уже был в этой цепочке (зацикливание). Найдите самую длинную цепочку (при равной длине — с более раннего ключа). Выведите её «А → Б → …» (в неё входит и последний пункт, если он вне ключей), «длина: N» и «зацикливание: да/нет» (было ли оно хоть в одной цепочке). Для посещённых пунктов используйте Set.', () => {
      const route = JSON.parse(input());
      let best = [];
      let loop = false;
      for (const start of Object.keys(route)) {
        const seen = new Set();
        const chain = [];
        let cur = start;
        while (cur !== undefined && !seen.has(cur)) {
          seen.add(cur);
          chain.push(cur);
          cur = route[cur];
        }
        if (cur !== undefined) loop = true;
        if (chain.length > best.length) best = chain;
      }
      console.log(best.join(' → '));
      console.log('длина: ' + best.length);
      console.log('зацикливание: ' + (loop ? 'да' : 'нет'));
    }, [['{"А":"Б","Б":"В","В":"Г","Г":"Е"}'], ['{"А":"Б","Б":"В","В":"Д","Г":"А"}'], ['{"1":"2","2":"3","3":"1","X":"1"}']], { require: ['Set'] }),
    T('co-07', 'Анаграммы', 'Даны слова одной строкой. Сгруппируйте анаграммы (слова из одних и тех же букв) с помощью Map, где ключ — буквы слова, отсортированные по алфавиту. Выведите группы из двух и более слов в порядке первого появления: слова через пробел. Если таких групп нет — «анаграмм нет».', () => {
      const groups = new Map();
      for (const w of input().split(' ')) {
        const key = w.toLowerCase().split('').sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(w);
      }
      let any = false;
      for (const g of groups.values()) {
        if (g.length > 1) {
          console.log(g.join(' '));
          any = true;
        }
      }
      if (!any) console.log('анаграмм нет');
    }, [['кот ток пила липа кто апельсин спаниель лапа'], ['раз два три']], { require: ['Map'] }),
    T('co-08', 'Две суммы за один проход', 'Даны числа одной строкой и число target. За один проход с Map (значение → индекс) найдите первую пару индексов i < j с a[i] + a[j] = target (по наименьшему j, затем по наименьшему i). Выведите индексы с 1 через пробел или «нет». Двойной цикл не используйте.', () => {
      const a = input().split(' ').map(Number);
      const target = Number(input());
      const seen = new Map();
      let answer = 'нет';
      for (let j = 0; j < a.length; j++) {
        const need = target - a[j];
        if (seen.has(need)) {
          answer = seen.get(need) + 1 + ' ' + (j + 1);
          break;
        }
        if (!seen.has(a[j])) seen.set(a[j], j);
      }
      console.log(answer);
    }, [['2 7 11 15', '9'], ['3 2 4', '6'], ['1 2 3', '100'], ['5 5 5', '10']], { require: ['Map'] }),
  ],
};

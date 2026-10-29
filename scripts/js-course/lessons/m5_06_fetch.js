const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const API = 'Учебный API — http://api.edu (адреса в теории урока).';
module.exports = {
  dir: 'm5/06-fetch',
  tasks: [
    T('ft-01', 'Список городов', API + ' Запросите GET /cities и выведите «городов: N», затем города по одному в строке с номерами «1. Город». Если дана буква (строка ввода), выведите только города на эту букву (пустая строка — все); если подходящих нет — «нет городов на букву X».', async () => {
      const letter = input();
      const r = await fetch('http://api.edu/cities');
      const cities = await r.json();
      const list = letter ? cities.filter((c) => c.startsWith(letter)) : cities;
      console.log('городов: ' + list.length);
      if (!list.length) console.log('нет городов на букву ' + letter);
      list.forEach((c, i) => console.log(i + 1 + '. ' + c));
    }, [[''], ['Б'], ['Я']], { require: ['fetch', 'await'] }),
    T('ft-02', 'Погода', API + ' Даны города до «конец». Для каждого запросите /weather (название закодируйте encodeURIComponent) и выведите «Город: temp°, sky, ветер wind м/с»; если ответ 404 — «Город: город не найден».', async () => {
      while (true) {
        const city = input();
        if (city === 'конец') break;
        const r = await fetch('http://api.edu/weather?city=' + encodeURIComponent(city));
        if (r.status === 404) {
          console.log(city + ': город не найден');
          continue;
        }
        const w = await r.json();
        console.log(w.city + ': ' + w.temp + '°, ' + w.sky + ', ветер ' + w.wind + ' м/с');
      }
    }, [['Ташкент', 'Москва', 'Нукус', 'конец'], ['Бухара', 'конец']], { require: ['fetch', 'encodeURIComponent'] }),
    T('ft-03', 'Самый тёплый город', API + ' Получите список городов и погоду во всех **параллельно** (Promise.all). Выведите города по убыванию температуры «Город: temp°» (при равной — по алфавиту, обычным сравнением), затем «средняя: X°» (одна цифра после точки) и «ясно в: города через запятую».', async () => {
      const cities = await (await fetch('http://api.edu/cities')).json();
      const all = await Promise.all(cities.map((c) => fetch('http://api.edu/weather?city=' + encodeURIComponent(c)).then((r) => r.json())));
      all.sort((a, b) => b.temp - a.temp || (a.city < b.city ? -1 : 1));
      all.forEach((w) => console.log(w.city + ': ' + w.temp + '°'));
      console.log('средняя: ' + (all.reduce((s, w) => s + w.temp, 0) / all.length).toFixed(1) + '°');
      console.log('ясно в: ' + all.filter((w) => w.sky === 'ясно').map((w) => w.city).join(', '));
    }, [[]], { require: ['Promise.all', 'fetch'], open: 1 }),
    T('ft-04', 'Обёртка getJSON', API + ' Напишите async getJSON(url, options), которая делает fetch и при !response.ok бросает Error(«HTTP статус: текст error из ответа»), иначе возвращает разобранный JSON. Даны пути до «конец» (например, /students/1, /weather, /nothing). Для каждого выведите JSON.stringify результата или «ошибка: сообщение».', async () => {
      async function getJSON(url, options) {
        const r = await fetch(url, options);
        const data = await r.json();
        if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + data.error);
        return data;
      }
      while (true) {
        const path = input();
        if (path === 'конец') break;
        try {
          console.log(JSON.stringify(await getJSON('http://api.edu' + path)));
        } catch (e) {
          console.log('ошибка: ' + e.message);
        }
      }
    }, [['/students/1', '/weather', '/students/9', '/nothing', '/rates', 'конец'], ['/students/3', '/weather?city=Нукус', 'конец']], { require: ['def:getJSON', 'throw'] }),
    T('ft-05', 'Курс валют', API + ' Дан ключ API (может быть неверным), затем строки «сумма ИЗ В» до «конец» (например, «100 USD UZS»). Запрашивайте /rates?base=ИЗ с заголовком X-API-Key. Выведите «сумма ИЗ = результат В» (результат с двумя знаками) или: при 401 — «нужен правильный ключ» (и прекратите работу), при неизвестной валюте ответа (400) — «неизвестная валюта ИЗ», если в ответе нет курса В — «нет курса ИЗ → В».', async () => {
      const key = input();
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [sum, from, to] = line.split(' ');
        const r = await fetch('http://api.edu/rates?base=' + from, { headers: { 'X-API-Key': key } });
        if (r.status === 401) {
          console.log('нужен правильный ключ');
          break;
        }
        if (r.status === 400) {
          console.log('неизвестная валюта ' + from);
          continue;
        }
        const { rates } = await r.json();
        if (!(to in rates)) console.log('нет курса ' + from + ' → ' + to);
        else console.log(sum + ' ' + from + ' = ' + (Number(sum) * rates[to]).toFixed(2) + ' ' + to);
      }
    }, [['edu-key-2026', '100 USD UZS', '50 EUR RUB', '10 GBP USD', '7 USD JPY', 'конец'], ['bad-key', '1 USD EUR', '2 EUR USD', 'конец']], { require: ['fetch', 'headers'] }),
    T('ft-06', 'Заметки', API + ' Команды до «конец»: «+ текст» — создать заметку POST /notes (тело JSON { text }) и вывести «создана #id»; «+» без текста — отправьте пустой текст и выведите ошибку из ответа «ошибка: …»; «list» — GET /notes и вывести «#id текст» каждой или «заметок нет».', async () => {
      while (true) {
        const line = input();
        if (line === 'конец') break;
        if (line === 'list') {
          const notes = await (await fetch('http://api.edu/notes')).json();
          if (!notes.length) console.log('заметок нет');
          notes.forEach((n) => console.log('#' + n.id + ' ' + n.text));
          continue;
        }
        const r = await fetch('http://api.edu/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: line.slice(2) }),
        });
        const data = await r.json();
        console.log(r.ok ? 'создана #' + data.id : 'ошибка: ' + data.error);
      }
    }, [['list', '+ купить хлеб', '+ сдать задание по JS', '+', 'list', 'конец'], ['+ один', '+ два', 'list', 'конец']], { require: ['fetch', 'JSON.stringify', 'method'] }),
    T('ft-07', 'Ведомость студентов', API + ' Даны id студентов через пробел. Загрузите всех параллельно, пропуская ненайденных (404) с сообщением «студент id не найден» (в порядке ввода, до основной ведомости). Затем выведите ведомость по убыванию среднего балла (при равном — в порядке ввода): «имя (группа): среднее» (две цифры после точки), и «лучшая группа: …» — с наибольшим средним среди студентов группы.', async () => {
      const ids = input().split(' ');
      const answers = await Promise.all(ids.map((id) => fetch('http://api.edu/students/' + id).then(async (r) => ({ id, ok: r.ok, data: await r.json() }))));
      const students = [];
      for (const a of answers) {
        if (!a.ok) console.log('студент ' + a.id + ' не найден');
        else {
          const s = a.data;
          students.push({ ...s, avg: s.scores.reduce((x, y) => x + y, 0) / s.scores.length });
        }
      }
      students.sort((a, b) => b.avg - a.avg);
      students.forEach((s) => console.log(s.name + ' (' + s.group + '): ' + s.avg.toFixed(2)));
      const groups = new Map();
      for (const s of students) {
        const g = groups.get(s.group) || [];
        g.push(s.avg);
        groups.set(s.group, g);
      }
      let best = null;
      let bestAvg = -1;
      for (const [g, list] of groups) {
        const avg = list.reduce((x, y) => x + y, 0) / list.length;
        if (avg > bestAvg) {
          best = g;
          bestAvg = avg;
        }
      }
      console.log('лучшая группа: ' + best);
    }, [['1 2 3 7'], ['2 5']], { require: ['Promise.all', 'fetch'] }),
    T('ft-08', 'Сводка для приложения', API + ' Ключ API — edu-key-2026. Соберите сводку для главного экрана: одновременно (Promise.all) загрузите погоду в данном городе, курс USD и данные студента с данным id. Если какой-то запрос не удался — вместо его строки выведите «нет данных: что». Формат: «Погода: Город temp°, sky», «Курс: 1 USD = X UZS», «Студент: имя, группа». Дан город и id студента.', async () => {
      const city = input();
      const id = input();
      const get = async (url, options) => {
        const r = await fetch(url, options);
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      };
      const [weather, rates, student] = await Promise.allSettled([
        get('http://api.edu/weather?city=' + encodeURIComponent(city)),
        get('http://api.edu/rates?base=USD', { headers: { 'X-API-Key': 'edu-key-2026' } }),
        get('http://api.edu/students/' + id),
      ]);
      console.log(weather.status === 'fulfilled' ? 'Погода: ' + weather.value.city + ' ' + weather.value.temp + '°, ' + weather.value.sky : 'нет данных: погода');
      console.log(rates.status === 'fulfilled' ? 'Курс: 1 USD = ' + rates.value.rates.UZS + ' UZS' : 'нет данных: курс');
      console.log(student.status === 'fulfilled' ? 'Студент: ' + student.value.name + ', ' + student.value.group : 'нет данных: студент');
    }, [['Самарканд', '3'], ['Лондон', '1'], ['Фергана', '42']], { require: ['fetch', 'await'] }),
  ],
};

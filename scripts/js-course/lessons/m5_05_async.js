const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const LOAD = 'Функцию load(name, ms, ok = true) напишите сами: она возвращает Promise, который через ms мс (setTimeout) выполняется со значением name или, при ok = false, отклоняется с Error(«не загрузилось: name»).';
module.exports = {
  dir: 'm5/05-async',
  tasks: [
    T('as-01', 'Обратный отсчёт', 'Дано N. С помощью setInterval раз в 1000 мс выводите N, N−1 … 1, затем «Старт!» и остановите интервал clearInterval. Сразу после запуска интервала выведите «отсчёт пошёл».', async () => {
      let n = Number(input());
      const id = setInterval(() => {
        if (n > 0) console.log(n--);
        else {
          console.log('Старт!');
          clearInterval(id);
        }
      }, 1000);
      console.log('отсчёт пошёл');
    }, [['3'], ['1'], ['5']], { require: ['setInterval', 'clearInterval'] }),
    T('as-02', 'Ждём по очереди', LOAD + ' Даны строки «имя мс» до «конец». Загрузите их последовательно (await в цикле) и после каждой выводите «загружено: имя», а в конце — «всего: N, общее время: S мс» (S — сумма задержек).', async () => {
      const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
      const tasks = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, ms] = line.split(' ');
        tasks.push([name, Number(ms)]);
      }
      let time = 0;
      for (const [name, ms] of tasks) {
        console.log('загружено: ' + (await load(name, ms)));
        time += ms;
      }
      console.log('всего: ' + tasks.length + ', общее время: ' + time + ' мс');
    }, [['профиль 300', 'новости 100', 'погода 200', 'конец'], ['один 50', 'конец']], { require: ['await', 'Promise'] }),
    T('as-03', 'Параллельно', LOAD + ' Даны строки «имя мс» до «конец». Запустите загрузки одновременно; каждая сама печатает «готово: имя» в момент завершения (then). Дождитесь всех через Promise.all и выведите «результаты: имена через запятую» (в порядке ввода) и «время: T мс» — наибольшая задержка.', async () => {
      const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
      const tasks = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, ms] = line.split(' ');
        tasks.push([name, Number(ms)]);
      }
      const results = await Promise.all(tasks.map(([name, ms]) => load(name, ms).then((v) => {
        console.log('готово: ' + v);
        return v;
      })));
      console.log('результаты: ' + results.join(', '));
      console.log('время: ' + Math.max(...tasks.map((t) => t[1])) + ' мс');
    }, [['профиль 300', 'новости 100', 'погода 200', 'конец'], ['a 10', 'b 10', 'конец']], { require: ['Promise.all'] }),
    T('as-04', 'Порядок вывода', 'Дана программа-«сценарий»: строки до «конец», каждая — «sync текст» (вывести сразу), «timeout мс текст» (вывести через setTimeout), «micro текст» (вывести в Promise.resolve().then). Выполните сценарий именно этими средствами — и порядок вывода получится как в браузере: сначала весь синхронный код, затем микрозадачи (then), затем таймеры по времени.', async () => {
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [kind, ...rest] = line.split(' ');
        if (kind === 'sync') console.log(rest.join(' '));
        else if (kind === 'micro') {
          const text = rest.join(' ');
          Promise.resolve().then(() => console.log(text));
        } else {
          const text = rest.slice(1).join(' ');
          setTimeout(() => console.log(text), Number(rest[0]));
        }
      }
    }, [['sync A', 'timeout 0 B', 'micro C', 'sync D', 'timeout 10 E', 'micro F', 'timeout 5 G', 'конец'], ['timeout 0 первый', 'timeout 0 второй', 'micro раньше таймеров', 'конец']], { require: ['setTimeout', '.then'] }),
    T('as-05', 'Ошибки загрузки', LOAD + ' Даны строки «имя мс ок|ошибка» до «конец». Загрузите всё параллельно через Promise.allSettled и выведите для каждого в порядке ввода «✓ имя» или «✗ сообщение ошибки», затем «успешно: K из N». Затем попробуйте Promise.all на тех же данных (заново запустив загрузки) и выведите «all: ок» или «all: сообщение первой ошибки по времени».', async () => {
      const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
      const tasks = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, ms, status] = line.split(' ');
        tasks.push([name, Number(ms), status === 'ок']);
      }
      const settled = await Promise.allSettled(tasks.map((t) => load(...t)));
      for (const r of settled) console.log(r.status === 'fulfilled' ? '✓ ' + r.value : '✗ ' + r.reason.message);
      console.log('успешно: ' + settled.filter((r) => r.status === 'fulfilled').length + ' из ' + tasks.length);
      try {
        await Promise.all(tasks.map((t) => load(...t)));
        console.log('all: ок');
      } catch (e) {
        console.log('all: ' + e.message);
      }
    }, [['фото 300 ок', 'видео 500 ошибка', 'текст 100 ок', 'музыка 200 ошибка', 'конец'], ['a 1 ок', 'конец']], { require: ['Promise.allSettled', 'Promise.all'] }),
    T('as-06', 'Тайм-аут', LOAD + ' Напишите withTimeout(promise, ms): Promise.race между promise и таймером, который отклоняется с Error(«тайм-аут ms мс»). Дан лимит, затем строки «имя мс» до «конец». Загружайте по очереди с лимитом и выводите «имя: загружено» или «имя: тайм-аут L мс».', async () => {
      const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
      function withTimeout(promise, ms) {
        const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('тайм-аут ' + ms + ' мс')), ms));
        return Promise.race([promise, timer]);
      }
      const limit = Number(input());
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, ms] = line.split(' ');
        try {
          await withTimeout(load(name, Number(ms)), limit);
          console.log(name + ': загружено');
        } catch (e) {
          console.log(name + ': ' + e.message);
        }
      }
    }, [['250', 'меню 100', 'каталог 400', 'корзина 249', 'отзывы 251', 'конец'], ['100', 'a 100', 'b 99', 'конец']], { require: ['def:withTimeout', 'Promise.race'] }),
    T('as-07', 'Повтор с паузой', 'Сервер отвечает по списку исходов (строка «ок»/«сбой» через пробел): каждый вызов request() через 100 мс выполняется с «данные» или отклоняется с Error(«сбой сервера»). Напишите async retry(fn, attempts, pause): при ошибке ждёт pause мс и пробует снова, после attempts неудач бросает последнюю ошибку. Перед каждой попыткой выводите «попытка k», при ошибке — «ошибка: …, жду pause мс» (кроме последней). Даны исходы, attempts и pause; в конце выведите «результат: …» или «сдаёмся: …».', async () => {
      const outcomes = input().split(' ');
      let call = 0;
      const request = () => new Promise((resolve, reject) => {
        const ok = outcomes[call++] === 'ок';
        setTimeout(() => (ok ? resolve('данные') : reject(new Error('сбой сервера'))), 100);
      });
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      async function retry(fn, attempts, pause) {
        for (let k = 1; ; k++) {
          console.log('попытка ' + k);
          try {
            return await fn();
          } catch (e) {
            if (k === attempts) throw e;
            console.log('ошибка: ' + e.message + ', жду ' + pause + ' мс');
            await sleep(pause);
          }
        }
      }
      const attempts = Number(input());
      const pause = Number(input());
      try {
        console.log('результат: ' + (await retry(request, attempts, pause)));
      } catch (e) {
        console.log('сдаёмся: ' + e.message);
      }
    }, [['сбой сбой ок', '5', '1000'], ['сбой сбой сбой', '3', '500'], ['ок', '1', '10']], { require: ['def:retry', 'async', 'await'] }),
    T('as-08', 'Очередь с ограничением', LOAD + ' Даны лимит одновременных загрузок L, затем строки «имя мс» до «конец». Загружайте не больше L одновременно: как только одна закончилась — начинайте следующую по порядку. Выводите «старт: имя» и «готово: имя» в момент событий, в конце — «всё загружено». Без сторонних библиотек: напишите функцию-«работника», которая в цикле берёт следующую задачу, и запустите L работников через Promise.all.', async () => {
      const load = (name, ms, ok = true) => new Promise((resolve, reject) => setTimeout(() => (ok ? resolve(name) : reject(new Error('не загрузилось: ' + name))), ms));
      const limit = Number(input());
      const tasks = [];
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, ms] = line.split(' ');
        tasks.push([name, Number(ms)]);
      }
      let next = 0;
      async function worker() {
        while (next < tasks.length) {
          const [name, ms] = tasks[next++];
          console.log('старт: ' + name);
          await load(name, ms);
          console.log('готово: ' + name);
        }
      }
      await Promise.all(Array.from({ length: limit }, worker));
      console.log('всё загружено');
    }, [['2', 'a 300', 'b 100', 'c 100', 'd 50', 'конец'], ['1', 'x 10', 'y 5', 'конец'], ['3', 'p 100', 'конец']], { require: ['Promise.all', 'async', 'await'] }),
  ],
};

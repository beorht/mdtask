# Асинхронность: таймеры и Promise

JavaScript выполняет код **в одном потоке**: пока работает одна функция, другие ждут. Долгие операции (таймер,
загрузка данных) не блокируют программу — их результат приходит **позже**, через очередь событий.

```js run
console.log('1: начало');
setTimeout(() => console.log('3: таймер'), 0);
console.log('2: конец кода');
```

Даже таймер на 0 мс срабатывает только после того, как текущий код закончился.

## setInterval

`setInterval(fn, мс)` вызывает `fn` раз в `мс`, пока его не остановят `clearInterval(id)`:

```js run
let n = 3;
const timer = setInterval(() => {
  console.log('тик', n);
  n--;
  if (n === 0) clearInterval(timer);
}, 1000);
```

В задачах курса время **виртуальное**: «секунды» проходят мгновенно, но порядок событий как в браузере.

## Promise

**Promise** — обещание результата в будущем. Он либо **выполнится** (`resolve(значение)`), либо **отклонится**
(`reject(ошибка)`).

```js run
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
wait(500, 'готово').then((v) => console.log(v));
```

`then(fn)` — что сделать с результатом, `catch(fn)` — с ошибкой, `finally(fn)` — в любом случае.

## async / await

`await` «ждёт» Promise внутри `async`-функции, и код читается сверху вниз, как обычный. Ошибки ловят обычным
`try/catch`. В задачах курса `await` можно писать прямо в программе.

```js run
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function steps() {
  console.log('шаг 1');
  await delay(300);
  console.log('шаг 2');
}
await steps();
console.log('всё');
```

## Последовательно или параллельно

- `await a(); await b();` — по очереди: время складывается;
- `await Promise.all([a(), b()])` — одновременно: время — как у самого долгого, результат — массив в **порядке
  вызова**, а не завершения; если хоть один отклонился — `Promise.all` отклоняется;
- `Promise.race([...])` — результат первого завершившегося; `Promise.allSettled([...])` — дождаться всех, с
  ошибками или без.

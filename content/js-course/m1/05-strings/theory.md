# Строки

Строку пишут в одинарных `'…'`, двойных `"…"` или обратных `` `…` `` кавычках. Обратные — **шаблонные строки**:
в них можно вставлять значения через `${…}`.

```js run
const name = 'Аня';
const age = 17;
console.log(`Меня зовут ${name}, через год мне будет ${age + 1}`);
```

## Длина и символы

`s.length` — длина; символ по номеру — `s[0]` (номера с нуля), последний — `s[s.length - 1]` или `s.at(-1)`.
Строки **не меняются**: методы возвращают новую строку.

## Полезные методы

| Метод | Что делает | Пример |
| --- | --- | --- |
| `slice(a, b)` | часть с позиции a до b (не включая) | `'JavaScript'.slice(0, 4)` → 'Java' |
| `toUpperCase()` / `toLowerCase()` | регистр | `'ok'.toUpperCase()` → 'OK' |
| `trim()` | убрать пробелы по краям | `'  да '.trim()` → 'да' |
| `includes(t)`, `startsWith(t)`, `endsWith(t)` | есть ли подстрока | `'кошка'.includes('шк')` → true |
| `indexOf(t)` | позиция подстроки или -1 | `'abc'.indexOf('c')` → 2 |
| `replace(a, b)` / `replaceAll(a, b)` | замена первого / всех | `'a-b-c'.replaceAll('-', '+')` |
| `split(sep)` | разрезать в массив | `'a b c'.split(' ')` → ['a', 'b', 'c'] |
| `repeat(n)` | повторить | `'ха'.repeat(3)` |
| `padStart(n, c)` | дополнить слева до длины n | `'7'.padStart(3, '0')` → '007' |

```js run
const word = 'Программирование';
console.log(word.length, word[0], word.at(-1));
console.log(word.slice(0, 9).toUpperCase());
console.log('москва'[0].toUpperCase() + 'москва'.slice(1));
```

## Части строки по разделителю

`split` возвращает **массив** (подробно — в модуле 4), а `join` склеивает массив обратно:

```js run
const parts = 'red,green,blue'.split(',');
console.log(parts.length, parts[1]);
console.log(parts.join(' / '));
```

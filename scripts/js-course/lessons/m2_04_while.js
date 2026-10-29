const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm2/04-while',
  theory: String.raw`
# while, do…while, break и continue

` + "`while`" + ` повторяет, **пока** условие истинно, — когда число шагов заранее неизвестно:

` + "```js run input=3|5|0" + `
let sum = 0;
let x = Number(input());
while (x !== 0) {
  sum += x;
  x = Number(input());
}
console.log('сумма:', sum);
` + "```" + `

Внутри цикла должно меняться то, от чего зависит условие, — иначе цикл никогда не закончится.

## do…while

Проверяет условие **после** шага — тело выполнится хотя бы один раз.

## break и continue

- ` + "`break`" + ` — немедленно выйти из цикла;
- ` + "`continue`" + ` — пропустить остаток шага и перейти к следующему.

` + "```js run" + `
for (let i = 1; i <= 10; i++) {
  if (i % 3 === 0) continue;
  if (i > 8) break;
  console.log(i);
}
` + "```" + `

## Цифры числа без строк

` + "`n % 10`" + ` — последняя цифра, ` + "`Math.floor(n / 10)`" + ` — число без неё. Повторяем, пока число не станет 0:

` + "```js run" + `
let n = 2027;
let digits = 0;
while (n > 0) {
  digits++;
  n = Math.floor(n / 10);
}
console.log(digits);
` + "```" + `

## Алгоритм Евклида

НОД двух чисел: пока второе не ноль, заменяем пару (a, b) на (b, a % b). Это один из самых старых алгоритмов —
ему больше двух тысяч лет.
`,
  tasks: [
    T('wh-01', 'Сумма до нуля', 'Вводятся целые числа по одному, последнее — 0 (признак конца). Выведите их сумму и количество (без нуля) через пробел.', 'let sum = 0;\nlet count = 0;\nlet x = Number(input());\nwhile (x !== 0) {\n  sum += x;\n  count++;\n  x = Number(input());\n}\nconsole.log(sum, count);', [['3', '5', '-2', '0'], ['0'], ['10', '0']], { require: ['while'] }),
    T('wh-02', 'Количество цифр', 'Дано натуральное число. Выведите количество его цифр, не превращая его в строку.', 'let n = Number(input());\nlet count = 0;\nwhile (n > 0) {\n  count++;\n  n = Math.floor(n / 10);\n}\nconsole.log(count);', [['2027'], ['7'], ['1000000'], ['99']], { require: ['while'], forbid: ['String', '.toString', '.length'] }),
    T('wh-03', 'НОД', 'Даны два натуральных числа. Выведите их наибольший общий делитель (алгоритм Евклида).', 'let a = Number(input());\nlet b = Number(input());\nwhile (b !== 0) {\n  const r = a % b;\n  a = b;\n  b = r;\n}\nconsole.log(a);', [['12', '18'], ['17', '5'], ['100', '75'], ['7', '7']], { require: ['while'] }),
    T('wh-04', 'Гипотеза Коллатца', 'Дано натуральное N. Пока N не 1: если чётное — делим на 2, иначе — 3N+1. Выведите все значения через пробел (от N до 1) и на второй строке — число шагов.', "let n = Number(input());\nlet line = String(n);\nlet steps = 0;\nwhile (n !== 1) {\n  n = n % 2 === 0 ? n / 2 : 3 * n + 1;\n  line += ' ' + n;\n  steps++;\n}\nconsole.log(line);\nconsole.log(steps);", [['6'], ['1'], ['7']], { require: ['while'] }),
    T('jsb-07', 'Фибоначчи до N', 'Дано N ≥ 0. Выведите через пробел все числа Фибоначчи (0 1 1 2 3 5 …), не превышающие N.', "const n = Number(input());\nlet a = 0;\nlet b = 1;\nlet line = '';\nwhile (a <= n) {\n  line += a + ' ';\n  const c = a + b;\n  a = b;\n  b = c;\n}\nconsole.log(line.trim());", [['100'], ['0'], ['1'], ['1000']], { require: ['while'] }),
    T('wh-06', 'Число наоборот', 'Дано натуральное число без нулей на конце. Выведите число, записанное в обратном порядке, только арифметикой.', 'let n = Number(input());\nlet r = 0;\nwhile (n > 0) {\n  r = r * 10 + n % 10;\n  n = Math.floor(n / 10);\n}\nconsole.log(r);', [['12345'], ['7'], ['9081'], ['111']], { require: ['while'], forbid: ['String', '.toString', '.split', '.reverse'] }),
    T('wh-07', 'Двоичная запись', 'Дано натуральное число. Выведите его двоичную запись, не используя toString(2) (делите на 2 и собирайте остатки).', "let n = Number(input());\nlet bits = '';\nwhile (n > 0) {\n  bits = (n % 2) + bits;\n  n = Math.floor(n / 2);\n}\nconsole.log(bits);", [['10'], ['1'], ['255'], ['1024']], { require: ['while'], forbid: ['.toString'] }),
    T('wh-08', 'Удвоение вклада', 'Даны сумма вклада и процент годовых. Каждый год сумма растёт на процент. Выведите, через сколько лет сумма впервые станет не меньше удвоенной.', 'const start = Number(input());\nconst p = Number(input());\nlet sum = start;\nlet years = 0;\nwhile (sum < start * 2) {\n  sum += sum * p / 100;\n  years++;\n}\nconsole.log(years);', [['1000', '10'], ['5000', '7'], ['100', '100'], ['300', '1']], { require: ['while'] }),
    T('wh-09', 'Только положительные', 'Вводятся числа до слова «стоп». Отрицательные числа пропускаются (continue). Выведите сумму положительных и наибольшее положительное через пробел (если положительных нет — «нет»).', "let sum = 0;\nlet best = null;\nwhile (true) {\n  const s = input();\n  if (s === 'стоп') break;\n  const x = Number(s);\n  if (x <= 0) continue;\n  sum += x;\n  if (best === null || x > best) best = x;\n}\nconsole.log(best === null ? 'нет' : sum + ' ' + best);", [['5', '-3', '8', '0', '2', 'стоп'], ['-1', '-2', 'стоп'], ['стоп']], { require: ['break', 'continue'] }),
    T('wh-10', 'Пароль с трёх попыток', 'Дан правильный пароль, затем попытки ввода (не больше трёх строк ввода после пароля, но их может быть меньше, если угадали раньше). Для каждой неверной попытки выведите «Неверно, осталось K», при угадывании — «Доступ разрешён», после трёх неудач — «Доступ заблокирован». Используйте do…while.', "const secret = input();\nlet left = 3;\nlet ok = false;\ndo {\n  const attempt = input();\n  left--;\n  if (attempt === secret) ok = true;\n  else if (left > 0) console.log('Неверно, осталось ' + left);\n} while (!ok && left > 0);\nconsole.log(ok ? 'Доступ разрешён' : 'Доступ заблокирован');", [['qwerty', '123', 'qwerty'], ['abc', 'a', 'b', 'c'], ['x', 'x']], { require: ['do'] }),
  ],
};

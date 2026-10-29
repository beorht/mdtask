const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm2/03-for',
  theory: String.raw`
# Цикл for

Цикл повторяет блок кода. ` + "`for`" + ` удобен, когда известно, **сколько раз** повторять:

` + "```js run" + `
for (let i = 1; i <= 5; i++) {
  console.log('шаг', i);
}
` + "```" + `

Три части в скобках: **начало** (` + "`let i = 1`" + `), **условие продолжения** (` + "`i <= 5`" + `), **шаг** (` + "`i++`" + `).
Шаг может быть любым: ` + "`i += 2`" + `, ` + "`i--`" + `, ` + "`i *= 2`" + `.

## Накопление: сумма и произведение

Переменная-накопитель заводится **до** цикла, в цикле к ней прибавляют (умножают):

` + "```js run input=5" + `
const n = Number(input());
let total = 0;
for (let k = 1; k <= n; k++) total += k * k;
console.log('сумма квадратов:', total);
` + "```" + `

## Счётчик

Сколько чисел подходит под условие — заводим счётчик и увеличиваем его в ` + "`if`" + `:

` + "```js run" + `
let count = 0;
for (let k = 1; k <= 100; k++) {
  if (k % 7 === 0) count++;
}
console.log(count);
` + "```" + `

## Строка за строкой

Чтобы вывести несколько значений в **одну** строку, их собирают в строку-накопитель, а выводят один раз после цикла:

` + "```js run" + `
let out = '';
for (let k = 10; k >= 0; k -= 2) out += k + ' ';
console.log(out.trim());
` + "```" + `

## Вложенные циклы

Цикл внутри цикла — для таблиц и «картинок» из символов. Внутренний проходит целиком на каждом шаге внешнего.

## Перебор символов строки

` + "`for (let i = 0; i < s.length; i++)`" + ` — номер символа ` + "`i`" + `, сам символ ` + "`s[i]`" + `.
`,
  tasks: [
    T('for-01', 'Числа от 1 до N', 'Дано N. Выведите числа от 1 до N в одну строку через пробел.', "const n = Number(input());\nlet line = '';\nfor (let i = 1; i <= n; i++) line += i + ' ';\nconsole.log(line.trim());", [['5'], ['1'], ['12']], { require: ['for'] }),
    T('for-02', 'Сумма от 1 до N', 'Дано N. Выведите сумму чисел от 1 до N, посчитанную циклом.', 'const n = Number(input());\nlet sum = 0;\nfor (let i = 1; i <= n; i++) sum += i;\nconsole.log(sum);', [['10'], ['1'], ['100']], { require: ['for'] }),
    T('for-03', 'Факториал', 'Дано N (0 ≤ N ≤ 20). Выведите N! (произведение чисел от 1 до N, 0! = 1).', 'const n = Number(input());\nlet f = 1;\nfor (let i = 2; i <= n; i++) f *= i;\nconsole.log(f);', [['5'], ['0'], ['1'], ['15']], { require: ['for'] }),
    T('for-04', 'Обратный отсчёт', 'Дано N. Выведите числа от N до 1 через пробел и в конце «Пуск!» в той же строке.', "const n = Number(input());\nlet line = '';\nfor (let i = n; i >= 1; i--) line += i + ' ';\nconsole.log(line + 'Пуск!');", [['5'], ['1'], ['3']], { require: ['for'] }),
    T('jsb-08', 'Таблица умножения сеткой', 'Дано N (1–9). Вложенными циклами for выведите таблицу умножения N×N сеткой: в строке i — произведения i × 1 … i × N, каждое дополнено пробелами слева до 4 символов (String(x).padStart(4)).', "const n = Number(input());\nfor (let i = 1; i <= n; i++) {\n  let row = '';\n  for (let j = 1; j <= n; j++) row += String(i * j).padStart(4);\n  console.log(row);\n}", [['9'], ['3'], ['1']], { require: ['for', '.padStart'] }),
    T('for-06', 'Сколько делится', 'Даны числа A, B и K. Выведите, сколько чисел от A до B включительно делится на K.', 'const a = Number(input());\nconst b = Number(input());\nconst k = Number(input());\nlet count = 0;\nfor (let i = a; i <= b; i++) if (i % k === 0) count++;\nconsole.log(count);', [['1', '100', '7'], ['10', '20', '5'], ['3', '4', '5'], ['-10', '10', '3']], { require: ['for'] }),
    T('for-07', 'Сумма цифр числа', 'Дано натуральное число (может быть длинным). Выведите сумму его цифр, перебирая символы строки циклом.', 'const s = input();\nlet sum = 0;\nfor (let i = 0; i < s.length; i++) sum += Number(s[i]);\nconsole.log(sum);', [['12345'], ['9'], ['1000000001'], ['987654321']], { require: ['for'], forbid: ['.reduce', '.split'] }),
    T('for-08', 'Делители числа', 'Дано натуральное N. Выведите через пробел все его делители по возрастанию, а на второй строке — их количество.', "const n = Number(input());\nlet line = '';\nlet count = 0;\nfor (let d = 1; d <= n; d++) {\n  if (n % d === 0) {\n    line += d + ' ';\n    count++;\n  }\n}\nconsole.log(line.trim());\nconsole.log(count);", [['12'], ['1'], ['13'], ['36']], { require: ['for'] }),
    T('for-09', 'Лесенка', 'Дано N. Выведите «лесенку» из N строк: в строке i — i символов «#».', "const n = Number(input());\nfor (let i = 1; i <= n; i++) {\n  let row = '';\n  for (let j = 0; j < i; j++) row += '#';\n  console.log(row);\n}", [['4'], ['1'], ['6']], { require: ['for'], forbid: ['.repeat'] }),
    T('for-10', 'Степени двойки', 'Дано N. Выведите через пробел все степени двойки, не превышающие N (1, 2, 4, 8 …).', "const n = Number(input());\nlet line = '';\nfor (let p = 1; p <= n; p *= 2) line += p + ' ';\nconsole.log(line.trim());", [['100'], ['1'], ['1024']], { require: ['for'], forbid: ['**', 'Math.pow'] }),
    T('for-11', 'Произведение цифр', 'Дано натуральное число строкой. Выведите произведение его цифр и количество нулей в нём (через пробел).', 'const s = input();\nlet p = 1;\nlet zeros = 0;\nfor (let i = 0; i < s.length; i++) {\n  p *= Number(s[i]);\n  if (s[i] === \'0\') zeros++;\n}\nconsole.log(p, zeros);', [['123'], ['105'], ['999'], ['7']], { require: ['for'] }),
    T('for-12', 'Квадрат из чисел', 'Дано N (1–9). Выведите квадрат N×N, где в строке i (с 1) стоят числа от i до i+N−1 через пробел.', "const n = Number(input());\nfor (let i = 1; i <= n; i++) {\n  let row = '';\n  for (let j = i; j < i + n; j++) row += j + ' ';\n  console.log(row.trim());\n}", [['3'], ['1'], ['5']], { require: ['for'] }),
  ],
};

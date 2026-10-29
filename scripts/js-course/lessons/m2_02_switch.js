const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm2/02-switch',
  theory: String.raw`
# Тернарный оператор и switch

## Тернарный оператор

` + "`условие ? значение1 : значение2`" + ` — короткая форма ` + "`if/else`" + `, которая **возвращает значение**:

` + "```js run input=-8" + `
const n = Number(input());
const sign = n >= 0 ? 'неотрицательное' : 'отрицательное';
console.log(sign);
` + "```" + `

Вкладывать тернарные операторы друг в друга можно, но больше двух уровней читать трудно — тогда лучше ` + "`if`" + `.

## switch

` + "`switch`" + ` сравнивает значение со списком вариантов (строгим ` + "`===`" + `):

` + "```js run input=3" + `
const day = Number(input());
switch (day) {
  case 1:
    console.log('понедельник');
    break;
  case 6:
  case 7:
    console.log('выходной');
    break;
  default:
    console.log('рабочий день');
}
` + "```" + `

- без ` + "`break`" + ` выполнение «проваливается» в следующий ` + "`case`" + ` — так объединяют варианты (6 и 7 выше);
- ` + "`default`" + ` — если ничего не подошло;
- ` + "`switch`" + ` удобен, когда вариантов много и они **точные** значения; для промежутков (« от 50 до 74 ») — ` + "`if`" + `.
`,
  tasks: [
    T('sw-01', 'День недели', 'Дан номер дня недели (1–7). Выведите его название («понедельник» … «воскресенье»), а для другого числа — «нет такого дня». Используйте switch.', "const d = Number(input());\nswitch (d) {\n  case 1: console.log('понедельник'); break;\n  case 2: console.log('вторник'); break;\n  case 3: console.log('среда'); break;\n  case 4: console.log('четверг'); break;\n  case 5: console.log('пятница'); break;\n  case 6: console.log('суббота'); break;\n  case 7: console.log('воскресенье'); break;\n  default: console.log('нет такого дня');\n}", [['1'], ['5'], ['7'], ['8']], { require: ['switch'] }),
    T('sw-02', 'Калькулятор', 'Даны число, знак операции (+, -, *, /) и число. Выведите результат; при делении на ноль — «делить на ноль нельзя», для неизвестного знака — «неизвестная операция». Используйте switch.', "const a = Number(input());\nconst op = input();\nconst b = Number(input());\nswitch (op) {\n  case '+': console.log(a + b); break;\n  case '-': console.log(a - b); break;\n  case '*': console.log(a * b); break;\n  case '/': console.log(b === 0 ? 'делить на ноль нельзя' : a / b); break;\n  default: console.log('неизвестная операция');\n}", [['6', '+', '3'], ['6', '/', '4'], ['6', '/', '0'], ['2', '^', '3'], ['7', '*', '-2']], { require: ['switch'] }),
    T('sw-03', 'Время года', 'Дан номер месяца (1–12). Выведите «зима», «весна», «лето» или «осень». Объедините месяцы одного сезона в switch без повторов кода.', "const m = Number(input());\nswitch (m) {\n  case 12: case 1: case 2: console.log('зима'); break;\n  case 3: case 4: case 5: console.log('весна'); break;\n  case 6: case 7: case 8: console.log('лето'); break;\n  default: console.log('осень');\n}", [['1'], ['4'], ['8'], ['11'], ['12']], { require: ['switch'] }),
    T('sw-04', 'Модуль числа', 'Дано число. Выведите его модуль, используя тернарный оператор (без Math.abs).', 'const n = Number(input());\nconsole.log(n < 0 ? -n : n);', [['-7'], ['5'], ['0']], { forbid: ['Math.abs'], require: ['?'] }),
    T('sw-05', 'Тип символа', 'Дан один символ. Выведите «цифра», «гласная» (русские а е ё и о у ы э ю я в любом регистре), «согласная» (другие русские буквы) или «другое».', "const ch = input().toLowerCase();\nif (ch >= '0' && ch <= '9') console.log('цифра');\nelse if ('аеёиоуыэюя'.includes(ch)) console.log('гласная');\nelse if ((ch >= 'а' && ch <= 'я') || ch === 'ё') console.log('согласная');\nelse console.log('другое');", [['7'], ['А'], ['ш'], ['?'], ['ё']]),
    T('sw-06', 'Оценка буквой', 'Дан балл 0–100. Выведите букву: A (90+), B (80+), C (70+), D (60+), F (меньше). Через цепочку тернарных операторов.', "const p = Number(input());\nconsole.log(p >= 90 ? 'A' : p >= 80 ? 'B' : p >= 70 ? 'C' : p >= 60 ? 'D' : 'F');", [['95'], ['80'], ['72'], ['60'], ['3']], { require: ['?'], forbid: ['if'] }),
    T('sw-07', 'Время суток', 'Дан час (0–23). Выведите «ночь» (0–5), «утро» (6–11), «день» (12–17) или «вечер» (18–23).', "const h = Number(input());\nif (h < 6) console.log('ночь');\nelse if (h < 12) console.log('утро');\nelse if (h < 18) console.log('день');\nelse console.log('вечер');", [['3'], ['6'], ['12'], ['17'], ['23']]),
    T('sw-08', 'Дней в месяце', 'Даны месяц (1–12) и год. Выведите количество дней в этом месяце (учитывая високосный год). Используйте switch.', 'const m = Number(input());\nconst y = Number(input());\nconst leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;\nswitch (m) {\n  case 2: console.log(leap ? 29 : 28); break;\n  case 4: case 6: case 9: case 11: console.log(30); break;\n  default: console.log(31);\n}', [['2', '2024'], ['2', '1900'], ['4', '2023'], ['12', '2023'], ['2', '2000']], { require: ['switch'] }),
    T('jsb-06', 'Сезон и тип дня', 'Даны номер месяца (1–12) и номер дня недели (1–7, где 6 и 7 — выходные). Выведите одной строкой «Время года, рабочий» или «Время года, выходной» (время года с заглавной буквы: «Зима», «Весна», «Лето», «Осень»). Время года определите через switch.', () => {
      const m = Number(input());
      const d = Number(input());
      let season;
      switch (m) {
        case 12: case 1: case 2: season = 'Зима'; break;
        case 3: case 4: case 5: season = 'Весна'; break;
        case 6: case 7: case 8: season = 'Лето'; break;
        default: season = 'Осень';
      }
      console.log(season + ', ' + (d >= 6 ? 'выходной' : 'рабочий'));
    }, [['1', '6'], ['4', '2'], ['7', '7'], ['10', '5']], { require: ['switch'] }),
  ],
};

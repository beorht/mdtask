const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm2/01-if',
  theory: String.raw`
# Условия if / else

` + "`if`" + ` выполняет блок кода, только если условие истинно; ` + "`else`" + ` — иначе; ` + "`else if`" + ` — следующая проверка.

` + "```js run input=17" + `
const age = Number(input());
if (age >= 18) {
  console.log('Взрослый');
} else if (age >= 14) {
  console.log('Подросток');
} else {
  console.log('Ребёнок');
}
` + "```" + `

- проверки идут **сверху вниз**, выполняется первая подходящая ветка;
- фигурные скобки ставьте всегда — так меньше ошибок;
- условия можно вкладывать, но чаще удобнее ` + "`&&`" + ` и ` + "`||`" + `.

## Максимум из трёх — алгоритм «текущий лучший»

Запоминаем первое значение как лучшее и сравниваем с ним остальные:

` + "```js run input=4|9|7" + `
const a = Number(input());
const b = Number(input());
const c = Number(input());
let best = a;
if (b > best) best = b;
if (c > best) best = c;
console.log(best);
` + "```" + `

Этот приём — основа поиска максимума в любом наборе данных (дальше — в циклах и массивах).

## Кусочные правила

Тарифы, скидки, оценки: значение зависит от того, в какой промежуток попало число. Проверяйте промежутки по
порядку — тогда в каждой ветке достаточно одной границы.
`,
  tasks: [
    T('if-01', 'Знак числа', 'Дано число. Выведите «положительное», «отрицательное» или «ноль».', "const n = Number(input());\nif (n > 0) {\n  console.log('положительное');\n} else if (n < 0) {\n  console.log('отрицательное');\n} else {\n  console.log('ноль');\n}", [['5'], ['-3'], ['0']], { require: ['if'] }),
    T('if-02', 'Наибольшее из трёх', 'Даны три числа. Выведите наибольшее, не используя Math.max.', 'const a = Number(input());\nconst b = Number(input());\nconst c = Number(input());\nlet best = a;\nif (b > best) best = b;\nif (c > best) best = c;\nconsole.log(best);', [['4', '9', '7'], ['10', '2', '3'], ['-5', '-1', '-9'], ['3', '3', '3']], { forbid: ['Math.max'], require: ['if'] }),
    T('if-03', 'Оценка за тест', 'Дан балл от 0 до 100. Выведите оценку: 90 и выше — 5, от 75 — 4, от 50 — 3, иначе 2.', 'const p = Number(input());\nif (p >= 90) console.log(5);\nelse if (p >= 75) console.log(4);\nelse if (p >= 50) console.log(3);\nelse console.log(2);', [['95'], ['75'], ['74'], ['50'], ['0']], { require: ['if'] }),
    T('jsb-05', 'Вид треугольника', 'Даны три стороны. Выведите «не треугольник», «равносторонний», «равнобедренный» или «разносторонний».', "const a = Number(input());\nconst b = Number(input());\nconst c = Number(input());\nif (a >= b + c || b >= a + c || c >= a + b) console.log('не треугольник');\nelse if (a === b && b === c) console.log('равносторонний');\nelse if (a === b || b === c || a === c) console.log('равнобедренный');\nelse console.log('разносторонний');", [['3', '3', '3'], ['3', '4', '5'], ['5', '8', '5'], ['1', '2', '3']], { require: ['if'] }),
    T('if-05', 'Четверть координат', 'Даны координаты x и y (не нули). Выведите номер четверти (1–4), в которой лежит точка.', 'const x = Number(input());\nconst y = Number(input());\nif (x > 0 && y > 0) console.log(1);\nelse if (x < 0 && y > 0) console.log(2);\nelse if (x < 0 && y < 0) console.log(3);\nelse console.log(4);', [['2', '3'], ['-1', '5'], ['-4', '-4'], ['7', '-2']], { require: ['if'] }),
    T('if-06', 'Такси', 'Поездка на такси: посадка 5000 сум, первые 3 км включены, каждый следующий км (до 10 км) — 2000 сум, после 10 км — 1500 сум за км. Дано расстояние в целых км. Выведите стоимость.', 'const km = Number(input());\nlet cost = 5000;\nif (km > 3) cost += (Math.min(km, 10) - 3) * 2000;\nif (km > 10) cost += (km - 10) * 1500;\nconsole.log(cost);', [['2'], ['3'], ['7'], ['10'], ['15']], { require: ['if'] }),
    T('if-07', 'Скидка по сумме', 'Дана сумма покупки. Скидка: от 10000 — 10%, от 5000 — 5%, иначе нет. Выведите две строки: «Скидка: N%» и «К оплате: S».', "const sum = Number(input());\nlet d = 0;\nif (sum >= 10000) d = 10;\nelse if (sum >= 5000) d = 5;\nconsole.log('Скидка: ' + d + '%');\nconsole.log('К оплате: ' + (sum - sum * d / 100));", [['12000'], ['5000'], ['4999'], ['10000']], { require: ['if'] }),
    T('if-08', 'Порядок трёх чисел', 'Даны три разных числа. Выведите их по возрастанию через пробел. Сортировку (sort) и Math.max/min не используйте.', 'let a = Number(input());\nlet b = Number(input());\nlet c = Number(input());\nlet t;\nif (a > b) { t = a; a = b; b = t; }\nif (b > c) { t = b; b = c; c = t; }\nif (a > b) { t = a; a = b; b = t; }\nconsole.log(a, b, c);', [['3', '1', '2'], ['1', '2', '3'], ['9', '-4', '0'], ['5', '4', '3']], { forbid: ['.sort', 'Math.max', 'Math.min'], require: ['if'] }),
    T('if-09', 'Ровесники', 'Даны дни, месяцы и годы рождения двух людей (по три строки на каждого: день, месяц, год). Выведите «первый старше», «второй старше» или «ровесники».', "const d1 = Number(input()), m1 = Number(input()), y1 = Number(input());\nconst d2 = Number(input()), m2 = Number(input()), y2 = Number(input());\nconst a = y1 * 10000 + m1 * 100 + d1;\nconst b = y2 * 10000 + m2 * 100 + d2;\nif (a < b) console.log('первый старше');\nelse if (a > b) console.log('второй старше');\nelse console.log('ровесники');", [['5', '3', '2008', '6', '3', '2008'], ['1', '1', '2010', '31', '12', '2009'], ['9', '9', '2009', '9', '9', '2009']], { require: ['if'] }),
    T('if-10', 'Квадратное уравнение', 'Даны коэффициенты a (не ноль), b, c уравнения ax² + bx + c = 0. Выведите «корней нет», один корень или два корня через пробел (меньший первым). Корни округлите до сотых (Math.round).', "const a = Number(input());\nconst b = Number(input());\nconst c = Number(input());\nconst d = b * b - 4 * a * c;\nconst r = (x) => Math.round(x * 100) / 100;\nif (d < 0) console.log('корней нет');\nelse if (d === 0) console.log(r(-b / (2 * a)));\nelse {\n  let x1 = (-b - Math.sqrt(d)) / (2 * a);\n  let x2 = (-b + Math.sqrt(d)) / (2 * a);\n  if (x1 > x2) { const t = x1; x1 = x2; x2 = t; }\n  console.log(r(x1), r(x2));\n}", [['1', '-3', '2'], ['1', '2', '1'], ['1', '0', '4'], ['-2', '4', '6'], ['2', '1', '-1']], { require: ['if'] }),
  ],
};

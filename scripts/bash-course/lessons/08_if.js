// Тема 8 «Условная конструкция if..then..else». Источник: NotionData/docs/languages/bash/🐚_Условная_конструкция_if.md.
module.exports = {
  dir: '08-if',
  theory: `
# Тема 8. Условная конструкция if..then..else

\`if\` выполняет команду-условие и смотрит на её код возврата. Обычно условие — это \`[ … ]\` или \`test\`.
Закрывается конструкция словом \`fi\` (\`if\` наоборот).

## Базовая форма и else

\`\`\`bash run
x=7
if [ "$x" -gt 5 ]; then
    echo "больше пяти"
else
    echo "пять или меньше"
fi
\`\`\`

Точку с запятой перед \`then\` можно заменить переносом строки.

## elif — несколько условий

\`\`\`bash run
value=-4
if [ "$value" -gt 0 ]; then
    echo "плюс"
elif [ "$value" -lt 0 ]; then
    echo "минус"
else
    echo "ноль"
fi
\`\`\`

Число \`elif\` неограниченно.

## Условие — любая команда

Условием может быть не только \`[ … ]\`, но и обычная команда — проверяется её код возврата:

\`\`\`bash run
if command -v bash >/dev/null 2>&1; then
    echo "bash на месте"
fi
\`\`\`

В \`[[ … ]]\` можно сверять строку с шаблоном (\`==\`) и регулярным выражением (\`=~\`).

## Частые ошибки

- Забыли \`fi\` — синтаксическая ошибка в конце скрипта.
- \`else if\` вместо \`elif\` требует второго \`fi\`.
- Без кавычек вокруг \`$1\` при пустом значении условие ломается.
`,
  tasks: [
    { id: 'if-01', title: 'Больше десяти', statement: 'Если `$1` больше 10 — выведите `больше 10`, иначе `10 или меньше`.',
      solution: 'if [ "$1" -gt 10 ]; then\n  echo "больше 10"\nelse\n  echo "10 или меньше"\nfi', require: ['if'], cases: [{ args: ['15'] }, { args: ['3'] }] },
    { id: 'if-02', title: 'Знак числа', statement: 'Определите знак числа `$1`: `положительное`, `отрицательное` или `ноль` (используйте `elif`).',
      solution: 'if [ "$1" -gt 0 ]; then\n  echo "положительное"\nelif [ "$1" -lt 0 ]; then\n  echo "отрицательное"\nelse\n  echo "ноль"\nfi', require: ['elif'], cases: [{ args: ['5'] }, { args: ['-3'] }, { args: ['0'] }] },
    { id: 'if-03', title: 'Сравнить два', statement: 'Сравните `$1` и `$2`: выведите `$1 больше $2`, `$1 меньше $2` или `равны`.',
      solution: 'if [ "$1" -gt "$2" ]; then\n  echo "$1 больше $2"\nelif [ "$1" -lt "$2" ]; then\n  echo "$1 меньше $2"\nelse\n  echo "равны"\nfi', require: ['elif'], cases: [{ args: ['5', '3'] }, { args: ['2', '8'] }, { args: ['4', '4'] }] },
    { id: 'if-04', title: 'Строк в файле', statement: 'Если файл из `$1` существует — выведите `Строк: <число>` (через `wc -l < "$1"`), иначе `нет файла`.',
      solution: 'if [ -f "$1" ]; then\n  echo "Строк: $(wc -l < "$1")"\nelse\n  echo "нет файла"\nfi', require: ['if'], cases: [{ args: ['data.txt'], files: { 'data.txt': 'a\nb\nc\n' } }, { args: ['nope.txt'] }] },
    { id: 'if-05', title: 'Високосный год', statement: 'Определите, високосный ли год `$1`: делится на 4 и не на 100, либо делится на 400. Выведите `високосный` или `обычный`.',
      solution: 'if (( $1 % 4 == 0 && $1 % 100 != 0 || $1 % 400 == 0 )); then\n  echo "високосный"\nelse\n  echo "обычный"\nfi', cases: [{ args: ['2024'] }, { args: ['2023'] }, { args: ['2000'] }, { args: ['1900'] }] },
    { id: 'if-06', title: 'Оценка по баллу', statement: 'По баллу `$1` выведите оценку: 90+ — `отлично`, 75+ — `хорошо`, 60+ — `удовлетворительно`, иначе `неуд`.',
      solution: 'if [ "$1" -ge 90 ]; then\n  echo "отлично"\nelif [ "$1" -ge 75 ]; then\n  echo "хорошо"\nelif [ "$1" -ge 60 ]; then\n  echo "удовлетворительно"\nelse\n  echo "неуд"\nfi', require: ['elif'], cases: [{ args: ['95'] }, { args: ['80'] }, { args: ['65'] }, { args: ['40'] }] },
    { id: 'if-07', title: 'Команда как условие', statement: 'Проверьте, установлен ли `git` (через `command -v git`): выведите `установлен` или `нет`.',
      solution: 'if command -v git >/dev/null 2>&1; then\n  echo "установлен"\nelse\n  echo "нет"\nfi', require: ['if'] },
    { id: 'if-08', title: 'Чёт или нечёт', statement: 'Определите, чётное число `$1` или нечётное (остаток от деления на 2). Выведите `чётное` или `нечётное`.',
      solution: 'if [ $(($1 % 2)) -eq 0 ]; then\n  echo "чётное"\nelse\n  echo "нечётное"\nfi', require: ['if'], cases: [{ args: ['8'] }, { args: ['7'] }] },
    { id: 'if-09', title: 'Максимум из трёх', statement: 'Выведите наибольшее из трёх чисел `$1 $2 $3`.',
      solution: 'if [ "$1" -ge "$2" ] && [ "$1" -ge "$3" ]; then\n  echo "$1"\nelif [ "$2" -ge "$3" ]; then\n  echo "$2"\nelse\n  echo "$3"\nfi', require: ['elif'], cases: [{ args: ['3', '7', '5'] }, { args: ['9', '2', '4'] }, { args: ['1', '1', '8'] }] },
    { id: 'if-10', title: 'Код из 4 цифр', statement: 'Проверьте, что `$1` — ровно 4 цифры (через `[[ … =~ ^[0-9]{4}$ ]]`): выведите `ок` или `неверно`.',
      solution: 'if [[ $1 =~ ^[0-9]{4}$ ]]; then\n  echo "ок"\nelse\n  echo "неверно"\nfi', require: ['dbracket'], cases: [{ args: ['1234'] }, { args: ['12'] }, { args: ['12ab'] }] },
    { id: 'if-11', title: 'Файл или каталог', statement: 'Для пути `$1`: если это каталог — выведите `каталог`, если файл — `файл`, если ничего нет — `нет` (вложенные условия).',
      solution: 'if [ -e "$1" ]; then\n  if [ -d "$1" ]; then\n    echo "каталог"\n  else\n    echo "файл"\n  fi\nelse\n  echo "нет"\nfi', require: ['if'], cases: [{ args: ['docs'], files: { docs: {} } }, { args: ['a.txt'], files: { 'a.txt': 'x' } }, { args: ['nope'] }] },
    { id: 'if-12', title: 'Пустой ввод', statement: 'Прочитайте строку: если она пустая — выведите `пусто`, иначе `введено: <строка>`.',
      solution: 'read x\nif [ -z "$x" ]; then\n  echo "пусто"\nelse\n  echo "введено: $x"\nfi', require: ['if', 'read'], cases: [{ stdin: '' }, { stdin: 'привет' }] },
    { id: 'if-13', title: 'Диапазон 1..10', statement: 'Проверьте, что `$1` в диапазоне от 1 до 10: выведите `да` или `нет`.',
      solution: 'if [ "$1" -ge 1 ] && [ "$1" -le 10 ]; then\n  echo "да"\nelse\n  echo "нет"\nfi', require: ['if'], cases: [{ args: ['5'] }, { args: ['15'] }] },
    { id: 'if-14', title: 'Светофор', statement: 'По цвету из `$1`: `red` — `стоп`, `green` — `иди`, иначе — `жди`.',
      solution: 'if [ "$1" = "red" ]; then\n  echo "стоп"\nelif [ "$1" = "green" ]; then\n  echo "иди"\nelse\n  echo "жди"\nfi', require: ['elif'], cases: [{ args: ['red'] }, { args: ['green'] }, { args: ['yellow'] }] },
    { id: 'if-15', title: 'FizzBuzz', statement: 'Для числа `$1`: делится на 3 и 5 — `FizzBuzz`, только на 3 — `Fizz`, только на 5 — `Buzz`, иначе само число.',
      solution: 'if [ $(($1 % 15)) -eq 0 ]; then\n  echo "FizzBuzz"\nelif [ $(($1 % 3)) -eq 0 ]; then\n  echo "Fizz"\nelif [ $(($1 % 5)) -eq 0 ]; then\n  echo "Buzz"\nelse\n  echo "$1"\nfi', require: ['elif'], cases: [{ args: ['15'] }, { args: ['9'] }, { args: ['10'] }, { args: ['7'] }] },
    { id: 'if-16', title: 'Знак введённого', statement: 'Прочитайте число и выведите `положительное`, `отрицательное` или `ноль`.',
      solution: 'read n\nif [ "$n" -gt 0 ]; then\n  echo "положительное"\nelif [ "$n" -lt 0 ]; then\n  echo "отрицательное"\nelse\n  echo "ноль"\nfi', require: ['elif', 'read'], cases: [{ stdin: '5' }, { stdin: '-3' }, { stdin: '0' }] },
  ],
  quiz: [
    { id: 'if-q01', kind: 'fix', prompt: 'Каким словом закрывается `if`?',
      options: ['fi', 'end', 'endif', 'done'], answer: 0, explain: '`if` закрывается `fi` (это `if` наоборот).' },
    { id: 'if-q02', kind: 'fix', prompt: 'Что лучше писать для второго условия — `else if` или `elif`?',
      options: ['elif — короче и не требует второго `fi`', '`else if` правильнее', 'Разницы нет', 'Оба неверны'], answer: 0, explain: '`else if` работает, но требует вложенного `fi`; `elif` удобнее.' },
    { id: 'if-q03', kind: 'output', prompt: 'Что выведет скрипт?', code: 'if [ 5 -gt 3 ]; then echo "да"; else echo "нет"; fi',
      options: ['да', 'нет', '5', '3'], answer: 0, explain: '5 больше 3 — выполняется ветка `then`.' },
    { id: 'if-q04', kind: 'error', prompt: 'Что не так со скриптом `if [ 1 -eq 1 ]; then echo ok`?',
      options: ['Нет закрывающего `fi`', 'Нет `then`', 'Нет `else`', 'Ошибки нет'], answer: 0, explain: 'Любой `if` должен закрываться `fi`.' },
    { id: 'if-q05', kind: 'output', prompt: 'Что выведет скрипт?', code: 'x=5\nif [ "$x" -gt 0 ]; then echo "+"; elif [ "$x" -lt 0 ]; then echo "-"; else echo "0"; fi',
      options: ['+', '-', '0', '5'], answer: 0, explain: '`x` больше нуля — первая ветка.' },
    { id: 'if-q06', kind: 'output', prompt: 'Что выведет скрипт?', code: 'if true; then echo "работает"; fi',
      options: ['работает', '(ничего)', 'true', 'if'], answer: 0, explain: '`true` возвращает код 0 — условие истинно.' },
    { id: 'if-q07', kind: 'fix', prompt: 'Что можно поставить условием в `if`?',
      options: ['Любую команду — проверяется её код возврата', 'Только `[ ]`', 'Только число', 'Только переменную'], answer: 0, explain: '`if` смотрит на код возврата любой команды.' },
    { id: 'if-q08', kind: 'output', prompt: 'Что выведет скрипт?', code: 'n=0\nif [ "$n" -eq 0 ]; then echo "ноль"; fi',
      options: ['ноль', '(ничего)', '0', 'n'], answer: 0, explain: '`n` равно 0 — условие истинно.' },
    { id: 'if-q09', kind: 'error', prompt: 'Почему `if [ $x = 5 ]` ломается при пустом `x`?',
      options: ['Без кавычек получается `[ = 5 ]` — ошибка; пишите `[ "$x" = 5 ]`', 'Нет ошибки', 'Нужно `-eq`', 'Нет `then`'], answer: 0, explain: 'Кавычки спасают от пустого значения переменной.' },
    { id: 'if-q10', kind: 'output', prompt: 'Введено `42`. Что выведет скрипт?', code: 'read a\nif [[ $a =~ ^[0-9]+$ ]]; then echo "число"; else echo "нет"; fi', run: { stdin: '42\n' },
      options: ['число', 'нет', '42', ''], answer: 0, explain: '`42` состоит только из цифр — регулярное выражение совпадает.' },
    { id: 'if-q11', kind: 'fix', prompt: 'Сколько `elif` можно поставить подряд?',
      options: ['Сколько угодно', 'Только один', 'Максимум три', 'Ни одного'], answer: 0, explain: 'Число `elif` не ограничено.' },
    { id: 'if-q12', kind: 'output', prompt: 'Что выведет скрипт?', code: 'if [ 2 -gt 5 ]; then echo "a"; elif [ 2 -gt 1 ]; then echo "b"; else echo "c"; fi',
      options: ['b', 'a', 'c', '2'], answer: 0, explain: 'Первое условие ложно, второе истинно — ветка `b`.' },
  ],
};

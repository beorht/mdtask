// Тема 9 «Конструкция case». Источник: NotionData/docs/languages/bash/🐚_Конструкция_case.md.
module.exports = {
  dir: '09-case',
  theory: `
# Тема 9. Конструкция case

\`case\` сравнивает одно значение с набором шаблонов. Удобнее цепочки \`elif\`, когда проверяется одна переменная
против множества вариантов.

## Синтаксис

\`\`\`bash run args=start
case "$1" in
    start)
        echo "Запуск сервиса"
        ;;
    stop|halt)
        echo "Остановка сервиса"
        ;;
    *)
        echo "Использование: {start|stop}"
        ;;
esac
\`\`\`

- Каждая ветка заканчивается \`;;\`.
- Конструкция закрывается словом \`esac\` (\`case\` наоборот).
- \`|\` внутри шаблона означает «или».
- \`*)\` — ветка по умолчанию, ставится последней.

## Шаблоны

Шаблоны работают как в pattern matching: можно писать \`*.txt)\`, \`[0-9])\` и т. п.

\`\`\`bash run args=7
case "$1" in
    [0-9])    echo "цифра" ;;
    [a-z])    echo "буква" ;;
    *)        echo "другое" ;;
esac
\`\`\`

## Важно

- **Выполняется только первая совпавшая ветка.** Остальные не проверяются.
- Забыли \`;;\` — следующая ветка будет считаться продолжением текущей.
- Нет кавычек вокруг \`"$1"\` — пустой аргумент даёт синтаксическую ошибку.
`,
  tasks: [
    { id: 'case-01', title: 'Управление сервисом', statement: 'По аргументу: `start` — `Запуск`, `stop` или `halt` — `Стоп`, `status` — `Статус`, иначе — `неизвестная команда`.',
      solution: 'case "$1" in\n  start) echo "Запуск" ;;\n  stop|halt) echo "Стоп" ;;\n  status) echo "Статус" ;;\n  *) echo "неизвестная команда" ;;\nesac', require: ['case'], cases: [{ args: ['start'] }, { args: ['halt'] }, { args: ['status'] }, { args: ['foo'] }] },
    { id: 'case-02', title: 'Тип файла', statement: 'По имени файла из `$1`: `.jpg`/`.png`/`.gif` — `изображение`, `.txt`/`.md` — `текст`, иначе — `неизвестно`.',
      solution: 'case "$1" in\n  *.jpg|*.png|*.gif) echo "изображение" ;;\n  *.txt|*.md) echo "текст" ;;\n  *) echo "неизвестно" ;;\nesac', require: ['case'], cases: [{ args: ['photo.jpg'] }, { args: ['notes.md'] }, { args: ['app.bin'] }] },
    { id: 'case-03', title: 'Какой символ', statement: 'По символу из `$1`: цифра `[0-9]` — `цифра`, латинская буква `[a-zA-Z]` — `буква`, иначе — `другой символ`.',
      solution: 'case "$1" in\n  [0-9]) echo "цифра" ;;\n  [a-zA-Z]) echo "буква" ;;\n  *) echo "другой символ" ;;\nesac', require: ['case'], cases: [{ args: ['5'] }, { args: ['k'] }, { args: ['#'] }] },
    { id: 'case-04', title: 'День недели', statement: 'По номеру дня `$1`: 1–5 — `будний`, 6 или 7 — `выходной`, иначе — `нет такого дня`.',
      solution: 'case "$1" in\n  1|2|3|4|5) echo "будний" ;;\n  6|7) echo "выходной" ;;\n  *) echo "нет такого дня" ;;\nesac', require: ['case'], cases: [{ args: ['3'] }, { args: ['6'] }, { args: ['9'] }] },
    { id: 'case-05', title: 'Да или нет', statement: 'По ответу из `$1`: `y`, `Y` или `yes` — `да`, `n`, `N` или `no` — `нет`, иначе — `не понял`.',
      solution: 'case "$1" in\n  y|Y|yes) echo "да" ;;\n  n|N|no) echo "нет" ;;\n  *) echo "не понял" ;;\nesac', require: ['case'], cases: [{ args: ['Y'] }, { args: ['no'] }, { args: ['maybe'] }] },
    { id: 'case-06', title: 'Пункт меню', statement: 'Прочитайте выбор: `1` — `дата`, `2` — `пользователь`, `q` — `выход`, иначе — `нет пункта`.',
      solution: 'read opt\ncase "$opt" in\n  1) echo "дата" ;;\n  2) echo "пользователь" ;;\n  q) echo "выход" ;;\n  *) echo "нет пункта" ;;\nesac', require: ['case', 'read'], cases: [{ stdin: '1' }, { stdin: 'q' }, { stdin: '9' }] },
    { id: 'case-07', title: 'Светофор', statement: 'По цвету из `$1`: `red` — `стоп`, `yellow` — `жди`, `green` — `иди`, иначе — `неизвестно`.',
      solution: 'case "$1" in\n  red) echo "стоп" ;;\n  yellow) echo "жди" ;;\n  green) echo "иди" ;;\n  *) echo "неизвестно" ;;\nesac', require: ['case'], cases: [{ args: ['red'] }, { args: ['green'] }, { args: ['blue'] }] },
    { id: 'case-08', title: 'Это скрипт?', statement: 'Если имя из `$1` оканчивается на `.sh` — выведите `скрипт`, иначе — `не скрипт`.',
      solution: 'case "$1" in\n  *.sh) echo "скрипт" ;;\n  *) echo "не скрипт" ;;\nesac', require: ['case'], cases: [{ args: ['run.sh'] }, { args: ['data.txt'] }] },
    { id: 'case-09', title: 'Русское или латинское', statement: 'По первой букве слова из `$1`: `[А-Я]` — `русское`, `[A-Z]` — `латинское`, иначе — `другое`.',
      solution: 'case "$1" in\n  [А-Я]*) echo "русское" ;;\n  [A-Z]*) echo "латинское" ;;\n  *) echo "другое" ;;\nesac', require: ['case'], cases: [{ args: ['Привет'] }, { args: ['Hello'] }, { args: ['123'] }] },
    { id: 'case-10', title: 'Оценка словом', statement: 'По оценке `$1`: `5` — `отлично`, `4` — `хорошо`, `3` — `удовлетворительно`, `2` — `неуд`, иначе — `нет оценки`.',
      solution: 'case "$1" in\n  5) echo "отлично" ;;\n  4) echo "хорошо" ;;\n  3) echo "удовлетворительно" ;;\n  2) echo "неуд" ;;\n  *) echo "нет оценки" ;;\nesac', require: ['case'], cases: [{ args: ['5'] }, { args: ['3'] }, { args: ['1'] }] },
    { id: 'case-11', title: 'Калькулятор', statement: 'По операции в `$2` над числами `$1` и `$3`: `+` — сумма, `-` — разность, `x` — произведение, иначе — `?`.',
      solution: 'case "$2" in\n  +) echo $(($1 + $3)) ;;\n  -) echo $(($1 - $3)) ;;\n  x) echo $(($1 * $3)) ;;\n  *) echo "?" ;;\nesac', require: ['case'], cases: [{ args: ['6', '+', '4'] }, { args: ['6', 'x', '4'] }, { args: ['6', '/', '4'] }] },
    { id: 'case-12', title: 'Единицы', statement: 'По единице из `$1`: `kb` — `килобайты`, `mb` — `мегабайты`, `gb` — `гигабайты`, иначе — `неизвестно`.',
      solution: 'case "$1" in\n  kb) echo "килобайты" ;;\n  mb) echo "мегабайты" ;;\n  gb) echo "гигабайты" ;;\n  *) echo "неизвестно" ;;\nesac', require: ['case'], cases: [{ args: ['mb'] }, { args: ['tb'] }] },
    { id: 'case-13', title: 'Только первая ветка', statement: 'Напишите `case` по значению `1` с двумя ветками-шаблонами `1)` подряд: первая выводит `первая`, вторая `вторая`. Убедитесь, что выполняется только `первая`.',
      solution: 'case 1 in\n  1) echo "первая" ;;\n  1) echo "вторая" ;;\nesac', require: ['case'] },
    { id: 'case-14', title: 'Провал в ветку', statement: 'С помощью `;&` (вместо `;;`) после ветки `1)` сделайте так, чтобы для значения `1` выполнились обе ветки: `один`, затем `два`.',
      solution: 'case 1 in\n  1) echo "один" ;&\n  2) echo "два" ;;\nesac', require: ['case'] },
    { id: 'case-15', title: 'Одна или две цифры', statement: 'По числу из `$1`: одна цифра `[0-9]` — `одна цифра`, две цифры `[0-9][0-9]` — `две цифры`, иначе — `другое`.',
      solution: 'case "$1" in\n  [0-9]) echo "одна цифра" ;;\n  [0-9][0-9]) echo "две цифры" ;;\n  *) echo "другое" ;;\nesac', require: ['case'], cases: [{ args: ['5'] }, { args: ['42'] }, { args: ['abc'] }] },
    { id: 'case-16', title: 'Время года', statement: 'По номеру месяца `$1`: 12, 1, 2 — `зима`, 3–5 — `весна`, 6–8 — `лето`, 9–11 — `осень`, иначе — `?`.',
      solution: 'case "$1" in\n  12|1|2) echo "зима" ;;\n  3|4|5) echo "весна" ;;\n  6|7|8) echo "лето" ;;\n  9|10|11) echo "осень" ;;\n  *) echo "?" ;;\nesac', require: ['case'], cases: [{ args: ['1'] }, { args: ['4'] }, { args: ['8'] }, { args: ['10'] }, { args: ['13'] }] },
  ],
  quiz: [
    { id: 'case-q01', kind: 'fix', prompt: 'Каким словом закрывается `case`?',
      options: ['esac', 'end', 'fi', 'done'], answer: 0, explain: '`case` закрывается `esac` (это `case` наоборот).' },
    { id: 'case-q02', kind: 'fix', prompt: 'Что означает `|` внутри шаблона case?',
      options: ['«или» — ветка срабатывает на любой из перечисленных шаблонов', 'Конвейер', 'Логическое И', 'Ничего'], answer: 0, explain: '`stop|halt)` срабатывает и на `stop`, и на `halt`.' },
    { id: 'case-q03', kind: 'fix', prompt: 'Зачем нужна ветка `*)`?',
      options: ['Срабатывает, если ни один шаблон не подошёл (по умолчанию)', 'Повторяет все ветки', 'Это синтаксическая ошибка', 'Обязательна первой'], answer: 0, explain: '`*)` — ветка по умолчанию, её ставят последней.' },
    { id: 'case-q04', kind: 'error', prompt: 'Что не так: `case 1 in  1) echo a  2) echo b ;; esac`?',
      options: ['Нет `;;` после первой ветки', 'Нет `esac`', 'Нет `*)`', 'Ошибки нет'], answer: 0, explain: 'Без `;;` вторая строка считается продолжением первой ветки.' },
    { id: 'case-q05', kind: 'output', prompt: 'Что выведет скрипт?', code: 'case "cat" in c*) echo "на c" ;; *) echo "другое" ;; esac',
      options: ['на c', 'другое', 'cat', 'c*'], answer: 0, explain: '`cat` подходит под шаблон `c*`.' },
    { id: 'case-q06', kind: 'output', prompt: 'Что выведет скрипт?', code: 'case 5 in [0-9]) echo "цифра" ;; *) echo "нет" ;; esac',
      options: ['цифра', 'нет', '5', '[0-9]'], answer: 0, explain: '`5` подходит под шаблон `[0-9]`.' },
    { id: 'case-q07', kind: 'fix', prompt: 'Сколько веток выполнится в обычном `case`?',
      options: ['Только первая подходящая', 'Все подходящие', 'Последняя', 'Ни одной'], answer: 0, explain: 'После первой совпавшей ветки остальные не проверяются.' },
    { id: 'case-q08', kind: 'output', prompt: 'Что выведет скрипт?', code: 'case "file.txt" in *.txt) echo "текст" ;; *) echo "?" ;; esac',
      options: ['текст', '?', 'file.txt', '*.txt'], answer: 0, explain: '`file.txt` подходит под `*.txt`.' },
    { id: 'case-q09', kind: 'output', prompt: 'Что выведет скрипт?', code: 'case "b" in a) echo 1 ;; b) echo 2 ;; *) echo 3 ;; esac',
      options: ['2', '1', '3', 'b'], answer: 0, explain: 'Значение `b` совпадает со второй веткой.' },
    { id: 'case-q10', kind: 'fix', prompt: 'Что ловит шаблон `[0-9]` в case?',
      options: ['Ровно одну цифру', 'Любое число', 'Любую букву', 'Любой символ'], answer: 0, explain: '`[0-9]` — один символ-цифра; для двух цифр нужно `[0-9][0-9]`.' },
    { id: 'case-q11', kind: 'output', prompt: 'Что выведет скрипт?', code: 'case yes in y|yes) echo "да" ;; *) echo "нет" ;; esac',
      options: ['да', 'нет', 'yes', 'y'], answer: 0, explain: '`yes` совпадает с шаблоном `y|yes`.' },
    { id: 'case-q12', kind: 'error', prompt: 'Что не так: `case 1 in 1) echo ok ;;` (без последней строки)?',
      options: ['Нет закрывающего `esac`', 'Нет `;;`', 'Нет `in`', 'Ошибки нет'], answer: 0, explain: '`case` должен закрываться `esac`.' },
  ],
};

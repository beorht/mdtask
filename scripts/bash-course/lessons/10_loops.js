// Тема 10 «Циклы». Источник: NotionData/docs/languages/bash/🐚_Циклы.md.
module.exports = {
  dir: '10-loops',
  theory: `
# Тема 10. Циклы

В bash три вида циклов: \`while\` (пока условие истинно), \`until\` (пока условие ложно) и \`for\`.

## while и until

\`\`\`bash run
i=1
while [ $i -le 3 ]; do
    echo "строка $i"
    i=$((i + 1))
done
\`\`\`

\`until\` — то же, но условие инвертировано: цикл идёт, **пока условие ложно**.

## for в C-стиле и for..in

\`\`\`bash run
for ((k = 0; k < 4; k++)); do
    echo -n "$k "
done
echo
\`\`\`

\`\`\`bash run
for color in red green blue; do
    echo "- $color"
done
\`\`\`

Построчное чтение файла — через \`while read\`:

\`\`\`bash
while IFS= read -r row; do
    echo "> $row"
done < файл.txt
\`\`\`

## Управление циклом

- \`break\` — выйти из цикла.
- \`continue\` — перейти к следующей итерации.

## Частые ошибки

- В \`while\` не меняется счётчик — цикл бесконечный.
- \`for f in *.txt\`, если файлов нет, выполнит тело один раз с буквальной строкой \`*.txt\`.
- Переменные, изменённые в цикле справа от конвейера (\`команда | while …\`), после цикла теряются — он в подоболочке.
`,
  tasks: [
    { id: 'loops-01', title: 'while 0..4', statement: 'Циклом `while` выведите числа от 0 до 4 в одну строку через пробел (`0 1 2 3 4 `).',
      solution: 'num=0\nwhile [ $num -lt 5 ]; do\n  echo -n "$num "\n  num=$((num + 1))\ndone\necho', require: ['while'] },
    { id: 'loops-02', title: 'until 0..4', statement: 'То же самое (числа 0–4 через пробел), но циклом `until`.',
      solution: 'num=0\nuntil [ $num -eq 5 ]; do\n  echo -n "$num "\n  num=$((num + 1))\ndone\necho', require: ['until'] },
    { id: 'loops-03', title: 'for в C-стиле', statement: 'Циклом `for ((…))` выведите числа от 0 до 4 в одну строку через пробел.',
      solution: 'for ((i = 0; i < 5; i++)); do\n  echo -n "$i "\ndone\necho', require: ['for'] },
    { id: 'loops-04', title: 'Чётные вниз', statement: 'Циклом `for ((…))` с шагом −2 выведите `10 8 6 4 2 ` в одну строку.',
      solution: 'for ((i = 10; i > 0; i -= 2)); do\n  echo -n "$i "\ndone\necho', require: ['for'] },
    { id: 'loops-05', title: 'Перебор списка', statement: 'Переберите слова `apple banana cherry` (`for … in`) и выведите каждое на своей строке.',
      solution: 'for fruit in apple banana cherry; do\n  echo "$fruit"\ndone', require: ['for'] },
    { id: 'loops-06', title: 'Сумма 1..N', statement: 'Циклом `while` посчитайте сумму чисел от 1 до `$1` и выведите её.',
      solution: 'n=$1\nsum=0\ni=1\nwhile [ $i -le $n ]; do\n  sum=$((sum + i))\n  i=$((i + 1))\ndone\necho "$sum"', require: ['while'], cases: [{ args: ['5'] }, { args: ['10'] }] },
    { id: 'loops-07', title: 'Кратные семи', statement: 'Выведите все числа от 1 до 100, делящиеся на 7, в одну строку через пробел. Остальные пропускайте через `continue`.',
      solution: 'for ((i = 1; i <= 100; i++)); do\n  if [ $((i % 7)) -ne 0 ]; then\n    continue\n  fi\n  echo -n "$i "\ndone\necho', require: ['continue'] },
    { id: 'loops-08', title: 'Таблица умножения', statement: 'Вложенными циклами выведите таблицу умножения 3×3: каждое произведение — через `printf "%4d"`, строки по три числа.',
      solution: 'for ((i = 1; i <= 3; i++)); do\n  for ((j = 1; j <= 3; j++)); do\n    printf "%4d" $((i * j))\n  done\n  echo\ndone', require: ['for', 'printf'] },
    { id: 'loops-09', title: 'Выход по break', statement: 'В бесконечном цикле `while true` считайте проходы: на 3-м выйдите через `break`, не печатая его. Для проходов 1 и 2 выведите `проход 1` и `проход 2`.',
      solution: 'n=0\nwhile true; do\n  n=$((n + 1))\n  if [ $n -eq 3 ]; then\n    break\n  fi\n  echo "проход $n"\ndone', require: ['break', 'while'] },
    { id: 'loops-10', title: 'Нечётные через seq', statement: 'С помощью `$(seq 1 2 9)` выведите нечётные числа `1 3 5 7 9 ` в одну строку.',
      solution: 'for i in $(seq 1 2 9); do\n  echo -n "$i "\ndone\necho', require: ['for'] },
    { id: 'loops-11', title: 'Факториал', statement: 'Циклом посчитайте факториал числа `$1` (произведение 1·2·…·N) и выведите его.',
      solution: 'n=$1\nf=1\nfor ((i = 1; i <= n; i++)); do\n  f=$((f * i))\ndone\necho "$f"', require: ['for'], cases: [{ args: ['5'] }, { args: ['4'] }] },
    { id: 'loops-12', title: 'Нумерация строк', statement: 'Прочитайте файл `data.txt` построчно (`while read`) и выведите каждую строку с номером: `1: <строка>`, `2: …` и так далее.',
      solution: 'n=1\nwhile IFS= read -r line; do\n  echo "$n: $line"\n  n=$((n + 1))\ndone < data.txt', require: ['while', 'read'], cases: [{ files: { 'data.txt': 'первая\nвторая\nтретья\n' } }] },
    { id: 'loops-13', title: 'Префикс к файлам', statement: 'Для каждого файла `*.txt` в текущем каталоге выведите его имя с префиксом `old_` (по одному на строке).',
      solution: 'for f in *.txt; do\n  echo "old_$f"\ndone', require: ['for'], cases: [{ files: { 'a.txt': '1', 'b.txt': '2' } }] },
    { id: 'loops-14', title: 'Обратный отсчёт', statement: 'Выведите обратный отсчёт от `$1` до 1 в одну строку через пробел, затем слово `Пуск`.',
      solution: 'for ((i = $1; i >= 1; i--)); do\n  echo -n "$i "\ndone\necho "Пуск"', require: ['for'], cases: [{ args: ['3'] }, { args: ['5'] }] },
    { id: 'loops-15', title: 'Сумма чётных', statement: 'Сложите только чётные числа среди аргументов и выведите сумму.',
      solution: 'sum=0\nfor n in "$@"; do\n  if [ $((n % 2)) -eq 0 ]; then\n    sum=$((sum + n))\n  fi\ndone\necho "$sum"', require: ['for'], cases: [{ args: ['1', '2', '3', '4'] }, { args: ['10', '20', '15'] }] },
    { id: 'loops-16', title: 'Максимум в списке', statement: 'Найдите наибольшее число среди аргументов (перебором в цикле) и выведите его.',
      solution: 'max=$1\nfor n in "$@"; do\n  if [ $n -gt $max ]; then\n    max=$n\n  fi\ndone\necho "$max"', require: ['for'], cases: [{ args: ['3', '7', '2'] }, { args: ['5'] }, { args: ['1', '9', '4'] }] },
  ],
  quiz: [
    { id: 'loops-q01', kind: 'fix', prompt: 'Чем отличаются `while` и `until`?',
      options: ['`while` крутится, пока условие истинно; `until` — пока ложно', 'Ничем', '`until` быстрее', '`while` только для чисел'], answer: 0, explain: 'У `until` условие инвертировано относительно `while`.' },
    { id: 'loops-q02', kind: 'output', prompt: 'Что выведет скрипт?', code: 'for i in 1 2 3; do echo -n "$i"; done',
      options: ['123', '1 2 3', '1\n2\n3', 'i i i'], answer: 0, explain: '`echo -n` печатает без переноса, цифры сливаются.' },
    { id: 'loops-q03', kind: 'output', prompt: 'Что выведет скрипт?', code: 'n=0\nwhile [ $n -lt 3 ]; do echo -n "$n"; n=$((n+1)); done',
      options: ['012', '123', '0 1 2', '0123'], answer: 0, explain: 'Цикл идёт при n = 0, 1, 2.' },
    { id: 'loops-q04', kind: 'fix', prompt: 'Чем отличаются `break` и `continue`?',
      options: ['`break` выходит из цикла, `continue` переходит к следующей итерации', 'Наоборот', 'Это одно и то же', '`continue` завершает скрипт'], answer: 0, explain: '`break` прерывает цикл, `continue` пропускает остаток текущего прохода.' },
    { id: 'loops-q05', kind: 'error', prompt: 'Что не так: `n=0; while [ $n -lt 3 ]; do echo $n; done`?',
      options: ['Счётчик `n` не меняется — цикл бесконечный', 'Нет `do`', 'Нет `done`', 'Ошибки нет'], answer: 0, explain: 'Без изменения `n` условие всегда истинно.' },
    { id: 'loops-q06', kind: 'output', prompt: 'Что выведет скрипт?', code: 'for i in $(seq 1 2 9); do echo -n "$i "; done',
      options: ['1 3 5 7 9 ', '1 2 3 4 5 6 7 8 9 ', '1 9 ', '2 4 6 8 '], answer: 0, explain: '`seq 1 2 9` — от 1 до 9 с шагом 2.' },
    { id: 'loops-q07', kind: 'output', prompt: 'Что выведет скрипт?', code: 'for ((i=1;i<=2;i++)); do for ((j=1;j<=2;j++)); do echo -n "$i$j "; done; done',
      options: ['11 12 21 22 ', '12 12 ', '11 22 ', '1 2 1 2 '], answer: 0, explain: 'Вложенные циклы перебирают все пары i, j.' },
    { id: 'loops-q08', kind: 'output', prompt: 'Что выведет скрипт?', code: 'for ((i=5;i>0;i-=2)); do echo -n "$i "; done',
      options: ['5 3 1 ', '5 4 3 2 1 ', '1 3 5 ', '5 2 '], answer: 0, explain: 'Старт 5, шаг −2: 5, 3, 1.' },
    { id: 'loops-q09', kind: 'output', prompt: 'Что выведет скрипт?', code: 'for i in 1 2 3 4; do if [ $((i%2)) -eq 0 ]; then continue; fi; echo -n "$i "; done',
      options: ['1 3 ', '2 4 ', '1 2 3 4 ', '1 3 5 '], answer: 0, explain: '`continue` пропускает чётные числа.' },
    { id: 'loops-q10', kind: 'fix', prompt: 'Что станет с переменной, изменённой внутри `команда | while …`, после цикла?',
      options: ['Изменения потеряются — цикл выполняется в подоболочке', 'Сохранятся', 'Будет ошибка', 'Переменная удалится'], answer: 0, explain: 'Правая часть конвейера — отдельная подоболочка.' },
    { id: 'loops-q11', kind: 'output', prompt: 'Что выведет скрипт?', code: 'i=1\nuntil [ $i -gt 3 ]; do echo -n "$i"; i=$((i+1)); done',
      options: ['123', '1234', '12', '0123'], answer: 0, explain: '`until` идёт, пока `i` не станет больше 3: i = 1, 2, 3.' },
    { id: 'loops-q12', kind: 'error', prompt: 'Что не так: `for i in 1 2 3; do echo $i` (без последней строки)?',
      options: ['Нет закрывающего `done`', 'Нет `do`', 'Нет `in`', 'Ошибки нет'], answer: 0, explain: 'Цикл `for` закрывается словом `done`.' },
  ],
};

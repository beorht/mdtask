// Тема 4 «Результат команд и операторов». Источник: NotionData/docs/languages/bash/🐚_Результат_команд_и_операторов.md.
module.exports = {
  dir: '04-result',
  theory: `
# Тема 4. Результат команд и операторов

Каждая команда сообщает результат числом (код возврата), и скрипт может на этом строиться.

## Код возврата \`$?\`

\`0\` — успех, не ноль — ошибка. Код последней команды хранится в \`$?\`.

\`\`\`bash run
true
echo "После true: $?"
false
echo "После false: $?"
\`\`\`

\`$?\` перезаписывается после каждой команды — если код нужен позже, сохраните его сразу: \`rc=$?\`.

## Подстановка команды \`$( )\`

Вывод команды можно вставить в строку или сохранить в переменную:

\`\`\`bash run
year=$(date +%Y)
echo "Идёт $year год"
\`\`\`

## Подстановка параметров

| Конструкция | Поведение |
|---|---|
| \`\${var:-значение}\` | если \`var\` пуста/не задана — подставить \`значение\` (сама \`var\` не меняется) |
| \`\${var:=значение}\` | то же, но ещё и присвоить \`значение\` переменной |
| \`\${var:?сообщение}\` | если пуста/не задана — ошибка и остановка скрипта |
| \`\${var:+значение}\` | если \`var\` задана и не пуста — подставить \`значение\`, иначе ничего |

\`\`\`bash run
echo "Порт: \${PORT:-8080}"
\`\`\`

## Операторы \`&&\` и \`||\`

- \`cmd1 && cmd2\` — \`cmd2\` выполнится, только если \`cmd1\` успешна.
- \`cmd1 || cmd2\` — \`cmd2\` выполнится, только если \`cmd1\` завершилась с ошибкой.

\`\`\`bash run
mkdir backup && echo "Папка создана" || echo "Не удалось"
\`\`\`

## Частые ошибки

- \`\${var:-…}\` не сохраняет значение; если нужно сохранить — \`\${var:=…}\`.
- \`$?\` меняется после каждой команды.
`,
  tasks: [
    { id: 'result-01', title: 'Код неуспеха', statement: 'Выполните команду `false`, затем выведите её код возврата: `Код: 1`.',
      solution: 'false\necho "Код: $?"' },
    { id: 'result-02', title: 'Текущий год', statement: 'Используя `$(date +%Y)`, выведите `Год: 2026`.',
      solution: 'echo "Год: $(date +%Y)"', require: ['cmdsub'] },
    { id: 'result-03', title: 'Дата в переменную', statement: 'Сохраните дату `$(date +%d.%m.%Y)` в переменную и выведите `Дата: 15.01.2026`.',
      solution: 'd=$(date +%d.%m.%Y)\necho "Дата: $d"', require: ['cmdsub'] },
    { id: 'result-04', title: 'Значение по умолчанию', statement: 'Выведите `Адрес: <HOST или localhost>`. Переменная `HOST` не задана — подставьте `localhost` через `${HOST:-localhost}`.',
      solution: 'echo "Адрес: ${HOST:-localhost}"', require: ['default'] },
    { id: 'result-05', title: 'Присвоить по умолчанию', statement: 'С помощью `${PORT:=3000}` выведите значение порта, а затем на следующей строке — саму переменную `$PORT`. Обе строки должны быть `3000`.',
      solution: 'echo "${PORT:=3000}"\necho "$PORT"', require: ['default'] },
    { id: 'result-06', title: 'Условный флаг', statement: 'Задайте `MODE=on` и выведите `режим: включён`. Используйте `${MODE:+включён}` (подставляется, только если переменная задана).',
      solution: 'MODE=on\necho "режим: ${MODE:+включён}"', require: ['default'] },
    { id: 'result-07', title: 'И — успех', statement: 'Создайте каталог `data` и, если получилось, выведите `создано`. Используйте оператор `&&`.',
      solution: 'mkdir data && echo "создано"', require: ['&&'] },
    { id: 'result-08', title: 'Сохранить код', statement: 'Выполните `false`, сразу сохраните её код в переменную `rc`, затем выполните `true` и выведите сохранённый код (должно быть `1`).',
      solution: 'false\nrc=$?\ntrue\necho "$rc"' },
    { id: 'result-09', title: 'Подстановка в строке', statement: 'Используя `$(seq 1 5 | tail -1)`, выведите `Последнее число: 5`.',
      solution: 'echo "Последнее число: $(seq 1 5 | tail -1)"', require: ['cmdsub'] },
    { id: 'result-10', title: 'Запасной вариант', statement: 'Попробуйте перейти в несуществующий каталог `/nope`, а если не вышло — выведите `нет каталога`. Используйте `||`.',
      solution: 'cd /nope || echo "нет каталога"', require: ['||'] },
    { id: 'result-11', title: 'Переменная окружения', statement: 'Выведите `Редактор: <EDITOR или nano>`. Переменная `EDITOR` не задана — подставьте `nano`.',
      solution: 'echo "Редактор: ${EDITOR:-nano}"', require: ['default'] },
    { id: 'result-12', title: 'Цепочка И', statement: 'Через `&&` выполните подряд: выведите `шаг1`, затем `шаг2` (вторая строка — только если первая успешна).',
      solution: 'echo "шаг1" && echo "шаг2"', require: ['&&'] },
    { id: 'result-13', title: 'Или', statement: 'Выполните `false`, а если неуспех — выведите `запасной вариант`. Используйте `||`.',
      solution: 'false || echo "запасной вариант"', require: ['||'] },
    { id: 'result-14', title: 'Вложенная подстановка', statement: 'Используя вложенную подстановку `$(echo $(date +%Y))`, выведите `2026`.',
      solution: 'echo "$(echo $(date +%Y))"', require: ['cmdsub'] },
    { id: 'result-15', title: 'Приветствие по умолчанию', statement: 'С помощью `${GREETING:=Привет}` выведите `Привет, мир`.',
      solution: 'echo "${GREETING:=Привет}, мир"', require: ['default'] },
    { id: 'result-16', title: 'Имя или пользователь', statement: 'Поздоровайтесь с первым аргументом, а если его нет — с именем текущего пользователя: `Привет, <имя>`. Используйте `${1:-$(whoami)}`.',
      solution: 'echo "Привет, ${1:-$(whoami)}"', require: ['default', 'cmdsub'], cases: [{ args: [] }, { args: ['Олег'] }] },
  ],
  quiz: [
    { id: 'result-q01', kind: 'output', prompt: 'Переменная `X` не задана. Что выведет скрипт?', code: 'echo "${X:-def}"',
      options: ['def', '', '$X', 'X'], answer: 0, explain: '`${X:-def}` подставляет `def`, если `X` пуста или не задана.' },
    { id: 'result-q02', kind: 'output', prompt: 'Что выведет скрипт?', code: 'X=5\necho "${X:-def}"',
      options: ['5', 'def', '$X', '5 def'], answer: 0, explain: '`X` задан, поэтому берётся его значение.' },
    { id: 'result-q03', kind: 'output', prompt: 'Что выведет скрипт?', code: 'echo "${X:=7}"\necho "$X"',
      options: ['7\n7', '7\n', 'def\n7', '7\ndef'], answer: 0, explain: '`:=` подставляет и присваивает, поэтому `X` становится 7.' },
    { id: 'result-q04', kind: 'output', prompt: 'Что выведет скрипт?', code: 'true && echo yes || echo no',
      options: ['yes', 'no', 'yes\nno', ''], answer: 0, explain: '`true` успешна, поэтому выполняется часть после `&&`.' },
    { id: 'result-q05', kind: 'output', prompt: 'Что выведет скрипт?', code: 'false && echo yes || echo no',
      options: ['no', 'yes', '', 'yes\nno'], answer: 0, explain: '`false` неуспешна: `&&`-часть пропускается, срабатывает `||`-часть.' },
    { id: 'result-q06', kind: 'fix', prompt: 'Как сохранить вывод команды `date` в переменную `d`?',
      options: ['d=$(date)', 'd=date', '$d=date', 'date > d'], answer: 0, explain: 'Подстановка команды: `d=$(date)`.' },
    { id: 'result-q07', kind: 'fix', prompt: 'Чем `${v:-x}` отличается от `${v:=x}`?',
      options: ['`:-` только подставляет x, `:=` ещё и присваивает v', 'Разницы нет', '`:=` только подставляет', '`:-` присваивает, `:=` нет'], answer: 0, explain: '`:=` меняет саму переменную, `:-` — нет.' },
    { id: 'result-q08', kind: 'output', prompt: 'Что выведет скрипт?', code: 'v=1\necho "a${v:+-b}"',
      options: ['a-b', 'a', 'a-', '-b'], answer: 0, explain: '`v` задана, поэтому `${v:+-b}` подставляет `-b`.' },
    { id: 'result-q09', kind: 'output', prompt: 'Что выведет скрипт?', code: 'v=\necho "a${v:+-b}"',
      options: ['a', 'a-b', '-b', ''], answer: 0, explain: '`v` пуста, поэтому `${v:+-b}` ничего не подставляет.' },
    { id: 'result-q10', kind: 'output', prompt: 'Что выведет скрипт?', code: 'echo "$(echo hi)"',
      options: ['hi', '$(echo hi)', 'echo hi', ''], answer: 0, explain: 'Подстановка команды вставляет вывод `echo hi`.' },
    { id: 'result-q11', kind: 'fix', prompt: 'Когда выполнится правая часть `cmd1 || cmd2`?',
      options: ['Если cmd1 завершилась с ошибкой (код не 0)', 'Всегда', 'Если cmd1 успешна', 'Никогда'], answer: 0, explain: '`||` запускает вторую команду при неудаче первой.' },
    { id: 'result-q12', kind: 'output', prompt: 'Что выведет скрипт?', code: 'false\nrc=$?\ntrue\necho "$rc"',
      options: ['1', '0', 'true', '$rc'], answer: 0, explain: '`$?` сохранили сразу после `false`, до того как `true` его перезапишет.' },
  ],
};

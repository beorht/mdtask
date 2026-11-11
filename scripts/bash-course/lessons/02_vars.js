// Тема 2 «Переменные и получение ввода». Источник: NotionData/docs/languages/bash/🐚_Переменные_и_ввод.md.
module.exports = {
  dir: '02-vars',
  theory: `
# Тема 2. Переменные и получение ввода

Переменная — именованная ячейка с данными. Главное правило новичка: **вокруг \`=\` не ставят пробелы**.

## Присваивание и чтение

\`\`\`bash run
name=Нина
echo "Имя: $name"
echo "\${name}_2026"
\`\`\`

- Присваивание: \`имя=значение\` — без пробелов вокруг \`=\`.
- Чтение значения — со знаком \`$\`. Фигурные скобки \`\${name}\` отделяют имя переменной от текста.

## Кавычки

\`\`\`bash run
name=Мир
echo "Привет, $name"
echo 'Привет, $name'
\`\`\`

В **двойных** кавычках переменная раскрывается, в **одинарных** — выводится буквально.

## Длина строки

\`\`\`bash run
s=Информатика
echo "Длина: \${#s}"
\`\`\`

## Переменные окружения и export

Системные переменные задаёт среда: \`$USER\`, \`$HOME\`. Своя переменная видна только текущему shell; чтобы её
унаследовали дочерние процессы, её **экспортируют**:

\`\`\`bash
MY_VAR="значение"
export MY_VAR
bash -c 'echo $MY_VAR'   # выведет значение, т.к. переменная экспортирована
\`\`\`

## Получение ввода: read

Команда \`read\` записывает введённую строку в переменную. Приглашение задаёт ключ \`-p\`:

\`\`\`bash
read -p "Как тебя зовут? " who
echo "Приятно познакомиться, $who"
\`\`\`

- \`-p "текст"\` — приглашение перед вводом.
- \`-s\` — не показывать ввод (для паролей).
- \`-r\` — не трактовать \`\\\` как экранирование.
- \`read a b\` разбивает введённую строку по пробелам: последней переменной достаётся весь остаток.

Несколько значений из строки можно прочитать так:

\`\`\`bash run
read a b <<< "раз два три"
echo "Остаток: $b"
\`\`\`

## echo -e, readonly, unset

\`\`\`bash run
echo -e "Товар:\\tКнига\\nЦена:\\t500"
\`\`\`

- \`readonly PI=3\` — защитить переменную от изменения.
- \`unset TEMP\` — удалить переменную.

## Частые ошибки

- \`name = Нина\` — пробелы вокруг \`=\` превращают строку в вызов команды \`name\`.
- \`echo name\` без \`$\` печатает слово \`name\`, а не значение.
- \`'$name'\` в одинарных кавычках не раскрывается.
`,
  tasks: [
    { id: 'vars-01', title: 'Присваивание', statement: 'Создайте переменную `name` со значением `Нина` и выведите строку `Имя: Нина`.',
      solution: 'name=Нина\necho "Имя: $name"' },
    { id: 'vars-02', title: 'Фигурные скобки', statement: 'Создайте переменную `city` со значением `Ташкент` и выведите `Ташкент_2026` (используйте `${city}`, чтобы отделить имя переменной от текста).',
      solution: 'city=Ташкент\necho "${city}_2026"' },
    { id: 'vars-03', title: 'Склейка строк', statement: 'Задайте `first=Hello` и `second=World` и выведите `Hello, World!`.',
      solution: 'first=Hello\nsecond=World\necho "$first, $second!"' },
    { id: 'vars-04', title: 'Длина строки', statement: 'Задайте переменную `s` со значением `Информатика` и выведите её длину через `${#s}`.',
      solution: 's=Информатика\necho "${#s}"', require: ['length'] },
    { id: 'vars-05', title: 'Ввод имени', statement: 'Спросите имя через `read -p "Введите имя: "` и выведите `Привет, <имя>!`.',
      solution: 'read -p "Введите имя: " name\necho "Привет, $name!"', require: ['read'], cases: [{ stdin: 'Нина' }, { stdin: 'Олег' }] },
    { id: 'vars-06', title: 'Имя и возраст', statement: 'Двумя командами `read` спросите имя и возраст и выведите `<имя>, тебе <возраст>`.',
      solution: 'read name\nread age\necho "$name, тебе $age"', require: ['read'], cases: [{ stdin: 'Нина\n20' }, { stdin: 'Олег\n31' }] },
    { id: 'vars-07', title: 'Поменять местами', statement: 'Прочитайте `read a b` одной строкой (два слова через пробел) и выведите их в обратном порядке: `<b> <a>`.',
      solution: 'read a b\necho "$b $a"', require: ['read'], cases: [{ stdin: 'Иван Петров' }, { stdin: 'left right' }] },
    { id: 'vars-08', title: 'Фамилия из строки', statement: 'Прочитайте `read first last <<< "Иван Петров"` и выведите фамилию.',
      solution: 'read first last <<< "Иван Петров"\necho "$last"', require: ['read'] },
    { id: 'vars-09', title: 'Табуляция и перенос', statement: 'Одной командой `echo -e` выведите две строки: `Имя:<таб>Нина` и `Город:<таб>Ташкент` (таб — `\\t`, перенос — `\\n`).',
      solution: 'echo -e "Имя:\\tНина\\nГород:\\tТашкент"', require: ['echo-e'] },
    { id: 'vars-10', title: 'Только чтение', statement: 'Создайте переменную `VERSION` со значением `3`, пометьте её `readonly` и выведите `Версия: 3`.',
      solution: 'readonly VERSION=3\necho "Версия: $VERSION"', require: ['readonly'] },
    { id: 'vars-11', title: 'Удалить переменную', statement: 'Задайте `TEMP=data`, удалите её командой `unset`, затем выведите `[$TEMP]` — должно получиться `[]`.',
      solution: 'TEMP=data\nunset TEMP\necho "[$TEMP]"', require: ['unset'] },
    { id: 'vars-12', title: 'Имя и порт', statement: 'Задайте `APP_NAME=demo` и `APP_PORT=8080` и выведите `demo:8080`.',
      solution: 'APP_NAME=demo\nAPP_PORT=8080\necho "$APP_NAME:$APP_PORT"' },
    { id: 'vars-13', title: 'Две строки из ввода', statement: 'Спросите имя и город (два `read`) и одной командой `echo -e` выведите `Имя: <имя>` и на следующей строке `Город: <город>`.',
      solution: 'read name\nread city\necho -e "Имя: $name\\nГород: $city"', require: ['read', 'echo-e'], cases: [{ stdin: 'Нина\nТашкент' }, { stdin: 'Олег\nСамарканд' }] },
    { id: 'vars-14', title: 'Приветствие', statement: 'Прочитайте имя и фамилию одной строкой (`read first last`) и выведите `Здравствуйте, <имя> <фамилия>!`.',
      solution: 'read first last\necho "Здравствуйте, $first $last!"', require: ['read'], cases: [{ stdin: 'Нина Каримова' }, { stdin: 'Олег Петров' }] },
    { id: 'vars-15', title: 'Буквально', statement: 'Задайте `price=1000`. Используя одинарные кавычки, выведите текст буквально: `$price` (а не значение).',
      solution: "price=1000\necho '$price'" },
    { id: 'vars-16', title: 'Длина пароля', statement: 'Прочитайте «пароль» через `read -s -p "Пароль: "` и выведите только его длину: `Длина: <N>`. Сам пароль не выводите.',
      solution: 'read -s -p "Пароль: " pass\necho "Длина: ${#pass}"', require: ['read', 'length'], cases: [{ stdin: 'secret' }, { stdin: 'qwerty12' }] },
  ],
  quiz: [
    { id: 'vars-q01', kind: 'output', prompt: 'Что выведет скрипт?', code: 'name=Мир\necho "Привет, $name"',
      options: ['Привет, Мир', 'Привет, $name', 'Привет, name', 'Привет,'], answer: 0, explain: 'В двойных кавычках `$name` заменяется значением переменной.' },
    { id: 'vars-q02', kind: 'error', prompt: 'Что не так со строкой `name = Нина`?',
      options: ['Вокруг `=` стоят пробелы — bash примет это за команду `name`', 'Ошибки нет', 'Нужны кавычки вокруг значения', 'Не хватает знака `$`'], answer: 0, explain: 'Присваивание пишется без пробелов: `name=Нина`.' },
    { id: 'vars-q03', kind: 'output', prompt: 'Что выведет скрипт?', code: "x=5\necho \"$x\"\necho '$x'",
      options: ['5\n$x', '5\n5', '$x\n$x', '5'], answer: 0, explain: 'Двойные кавычки раскрывают `$x`, одинарные — нет.' },
    { id: 'vars-q04', kind: 'output', prompt: 'Что выведет скрипт?', code: 'greet="Hello"\necho "${#greet}"',
      options: ['5', 'Hello', '6', '${#greet}'], answer: 0, explain: '`${#greet}` — длина строки, в «Hello» 5 символов.' },
    { id: 'vars-q05', kind: 'output', prompt: 'Что выведет скрипт?', code: 'echo name',
      options: ['name', '(пусто)', 'значение переменной name', 'ошибка'], answer: 0, explain: 'Без `$` печатается само слово `name`, а не значение переменной.' },
    { id: 'vars-q06', kind: 'fix', prompt: 'Как присвоить переменной `age` значение `20`?',
      options: ['age=20', 'age = 20', '$age=20', 'let age = 20'], answer: 0, explain: 'Присваивание — без пробелов и без `$` слева.' },
    { id: 'vars-q07', kind: 'output', prompt: 'Что выведет скрипт?', code: 'a=1\nb=2\necho "$a$b"',
      options: ['12', '1 2', '3', '$a$b'], answer: 0, explain: 'Значения подставляются подряд, без пробела между ними.' },
    { id: 'vars-q08', kind: 'output', prompt: 'Что выведет скрипт?', code: 'city=Ташкент\necho "${city}цы"',
      options: ['Ташкентцы', 'Ташкент цы', '${city}цы', 'цы'], answer: 0, explain: 'Фигурные скобки отделяют имя `city` от следующего текста.' },
    { id: 'vars-q09', kind: 'output', prompt: 'Что выведет скрипт?', code: 'read x <<< "Привет"\necho "$x!"',
      options: ['Привет!', '$x!', '!', 'Привет'], answer: 0, explain: '`read` кладёт строку из `<<<` в переменную `x`.' },
    { id: 'vars-q10', kind: 'fix', prompt: 'Как прочитать строку с клавиатуры в переменную `city`?',
      options: ['read city', 'read $city', 'city=read', 'input city'], answer: 0, explain: '`read city` читает строку и кладёт её в переменную `city` (без `$`).' },
    { id: 'vars-q11', kind: 'output', prompt: 'Что выведет скрипт?', code: 'read a b <<< "10 20 30"\necho "$a-$b"',
      options: ['10-20 30', '10-20', '10 20-30', '10-20-30'], answer: 0, explain: 'При `read a b` последней переменной достаётся весь остаток строки.' },
    { id: 'vars-q12', kind: 'fix', prompt: 'Что делает `export MY_VAR`?',
      options: ['Делает переменную видимой дочерним процессам (например, `bash -c`)', 'Удаляет переменную', 'Защищает переменную от изменения', 'Печатает значение переменной'], answer: 0, explain: 'Без `export` переменную видит только текущий shell.' },
  ],
};

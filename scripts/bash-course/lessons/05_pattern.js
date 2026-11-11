// Тема 5 «Pattern matching». Источник: NotionData/docs/languages/bash/🐚_Pattern_matching.md.
module.exports = {
  dir: '05-pattern',
  theory: `
# Тема 5. Pattern matching (обрезка строк)

Bash умеет отрезать начало или конец строки по шаблону (с символами \`*\` и \`?\`) — без внешних программ.

| Конструкция | Что удаляется |
|---|---|
| \`\${var#шаблон}\` | кратчайшее совпадение **с начала** |
| \`\${var##шаблон}\` | наибольшее совпадение **с начала** |
| \`\${var%шаблон}\` | кратчайшее совпадение **с конца** |
| \`\${var%%шаблон}\` | наибольшее совпадение **с конца** |

Запомнить: \`#\` режет **с начала**, \`%\` — **с конца** (на клавиатуре \`#\` левее \`%\`). Двойной знак — жадный режим
(удаляет самое длинное совпадение), одинарный — самое короткое.

\`\`\`bash run
path="/home/user/Documents/report.txt"
echo "\${path##*/}"
echo "\${path%/*}"
echo "\${path##*.}"
echo "\${path%.*}"
\`\`\`

## Замена подстроки

| Конструкция | Что делает |
|---|---|
| \`\${var/что/на}\` | заменить **первое** вхождение |
| \`\${var//что/на}\` | заменить **все** вхождения |

\`\`\`bash run
s="archive.tar.gz"
echo "\${s/tar/zip}"
echo "\${s//a/A}"
\`\`\`

## Частые ошибки

- \`*\` в шаблоне — любое число любых символов, включая пустоту (не раскрывается в список файлов).
- \`\${path#/}\` удалит только первый символ \`/\`, а не всё до него.
`,
  tasks: [
    { id: 'pattern-01', title: 'Имя файла', statement: 'Из пути `p="/home/user/report.txt"` получите имя файла `report.txt` (удалите всё до последнего `/` через `##*/`).',
      solution: 'p="/home/user/report.txt"\necho "${p##*/}"' },
    { id: 'pattern-02', title: 'Каталог', statement: 'Из пути `p="/home/user/report.txt"` получите каталог `/home/user` (удалите всё после последнего `/` через `%/*`).',
      solution: 'p="/home/user/report.txt"\necho "${p%/*}"' },
    { id: 'pattern-03', title: 'Расширение', statement: 'Из пути `p="/home/user/report.txt"` получите только расширение `txt` (через `##*.`).',
      solution: 'p="/home/user/report.txt"\necho "${p##*.}"' },
    { id: 'pattern-04', title: 'Без расширения', statement: 'Из пути `p="/home/user/report.txt"` уберите расширение, получив `/home/user/report` (через `%.*`).',
      solution: 'p="/home/user/report.txt"\necho "${p%.*}"' },
    { id: 'pattern-05', title: 'Одно расширение', statement: 'Из строки `s="archive.tar.gz"` уберите одно (последнее) расширение, получив `archive.tar`.',
      solution: 's="archive.tar.gz"\necho "${s%.*}"' },
    { id: 'pattern-06', title: 'Всё после первой точки', statement: 'Из строки `s="archive.tar.gz"` уберите всё, начиная с первой точки, получив `archive` (через `%%.*`).',
      solution: 's="archive.tar.gz"\necho "${s%%.*}"' },
    { id: 'pattern-07', title: 'После первой точки', statement: 'Из строки `s="archive.tar.gz"` оставьте всё после первой точки, получив `tar.gz` (через `#*.`).',
      solution: 's="archive.tar.gz"\necho "${s#*.}"' },
    { id: 'pattern-08', title: 'Сменить расширение', statement: 'Из строки `f="notes.txt"` сделайте `notes.md` (уберите `.txt` и допишите `.md`).',
      solution: 'f="notes.txt"\necho "${f%.txt}.md"' },
    { id: 'pattern-09', title: 'Заменить первое', statement: 'В строке `s="archive.tar.gz"` замените первое `tar` на `zip`, получив `archive.zip.gz` (через `${s/tar/zip}`).',
      solution: 's="archive.tar.gz"\necho "${s/tar/zip}"', require: ['subst'] },
    { id: 'pattern-10', title: 'Заменить все', statement: 'В строке `s="banana"` замените все `a` на `o`, получив `bonono` (через `${s//a/o}`).',
      solution: 's="banana"\necho "${s//a/o}"', require: ['subst'] },
    { id: 'pattern-11', title: 'Разбор пути', statement: 'Для `p="/var/log/nginx/access.log.1"` выведите на трёх строках: имя файла `access.log.1`, каталог `/var/log/nginx`, имя без последнего расширения `access.log`.',
      solution: 'p="/var/log/nginx/access.log.1"\necho "${p##*/}"\necho "${p%/*}"\nname="${p##*/}"\necho "${name%.*}"' },
    { id: 'pattern-12', title: 'jpg в png', statement: 'Из переданного в `$1` пути к файлу `.jpg` выведите то же имя с расширением `.png`.',
      solution: 'echo "${1%.jpg}.png"', cases: [{ args: ['photo.jpg'] }, { args: ['/img/cat.jpg'] }] },
    { id: 'pattern-13', title: 'Логин и хост', statement: 'Из строки `email="user@example.com"` выведите на двух строках логин `user` (через `%@*`) и хост `example.com` (через `##*@`).',
      solution: 'email="user@example.com"\necho "${email%@*}"\necho "${email##*@}"' },
    { id: 'pattern-14', title: 'Убрать "./"', statement: 'Из строки `s="./script.sh"` уберите ведущие `./`, получив `script.sh` (через `#./`).',
      solution: 's="./script.sh"\necho "${s#./}"' },
    { id: 'pattern-15', title: 'Убрать префикс', statement: 'Из строки `name="img_0423"` уберите префикс `img_`, получив `0423` (через `#img_`).',
      solution: 'name="img_0423"\necho "${name#img_}"' },
    { id: 'pattern-16', title: 'Год и день', statement: 'Из даты `d="2026-11-11"` выведите на двух строках год `2026` (через `%%-*`) и день `11` (через `##*-`).',
      solution: 'd="2026-11-11"\necho "${d%%-*}"\necho "${d##*-}"' },
  ],
  quiz: [
    { id: 'pattern-q01', kind: 'output', prompt: 'Что выведет скрипт?', code: 'p=/a/b/c.txt\necho "${p##*/}"',
      options: ['c.txt', '/a/b', 'txt', 'c'], answer: 0, explain: '`##*/` удаляет всё до последнего `/` — остаётся имя файла.' },
    { id: 'pattern-q02', kind: 'output', prompt: 'Что выведет скрипт?', code: 'p=/a/b/c.txt\necho "${p%/*}"',
      options: ['/a/b', 'c.txt', '/a/b/c', 'txt'], answer: 0, explain: '`%/*` удаляет всё после последнего `/` — остаётся каталог.' },
    { id: 'pattern-q03', kind: 'output', prompt: 'Что выведет скрипт?', code: 's=a.tar.gz\necho "${s%.*}"',
      options: ['a.tar', 'a', 'gz', 'tar.gz'], answer: 0, explain: '`%.*` убирает кратчайшее с конца — одно расширение.' },
    { id: 'pattern-q04', kind: 'output', prompt: 'Что выведет скрипт?', code: 's=a.tar.gz\necho "${s%%.*}"',
      options: ['a', 'a.tar', 'gz', 'tar.gz'], answer: 0, explain: '`%%.*` жадно убирает всё с первой точки.' },
    { id: 'pattern-q05', kind: 'output', prompt: 'Что выведет скрипт?', code: 's=a.tar.gz\necho "${s#*.}"',
      options: ['tar.gz', 'a', 'gz', 'a.tar'], answer: 0, explain: '`#*.` убирает кратчайшее с начала — до первой точки.' },
    { id: 'pattern-q06', kind: 'output', prompt: 'Что выведет скрипт?', code: 's=banana\necho "${s/a/A}"',
      options: ['bAnana', 'bAnAnA', 'banana', 'Banana'], answer: 0, explain: 'Одинарный `/` заменяет только первое вхождение.' },
    { id: 'pattern-q07', kind: 'output', prompt: 'Что выведет скрипт?', code: 's=banana\necho "${s//a/A}"',
      options: ['bAnAnA', 'bAnana', 'banana', 'BANANA'], answer: 0, explain: 'Двойной `//` заменяет все вхождения.' },
    { id: 'pattern-q08', kind: 'fix', prompt: 'Как получить расширение файла из переменной `f`?',
      options: ['${f##*.}', '${f%.*}', '${f#*.}', '${f%%.*}'], answer: 0, explain: '`##*.` удаляет всё до последней точки — остаётся расширение.' },
    { id: 'pattern-q09', kind: 'fix', prompt: 'С какого конца строки режут `#` и `%`?',
      options: ['`#` — с начала, `%` — с конца', 'Наоборот: `#` с конца', 'Оба с начала', 'Оба с конца'], answer: 0, explain: 'На клавиатуре `#` левее `%`, как и начало строки левее конца.' },
    { id: 'pattern-q10', kind: 'output', prompt: 'Что выведет скрипт?', code: 'p=/etc/hosts\necho "${p#/}"',
      options: ['etc/hosts', 'hosts', '/etc/hosts', 'etc'], answer: 0, explain: '`#/` удаляет только первый символ `/`, а не всё до него.' },
    { id: 'pattern-q11', kind: 'fix', prompt: 'Чем двойной знак (`##`, `%%`) отличается от одинарного?',
      options: ['Удаляет самое длинное совпадение (жадный режим)', 'Удаляет ровно два символа', 'Ничем', 'Всегда режет с конца'], answer: 0, explain: 'Двойной знак — жадный режим, одинарный — самое короткое совпадение.' },
    { id: 'pattern-q12', kind: 'output', prompt: 'Что выведет скрипт?', code: 'f=notes.txt\necho "${f%.txt}.md"',
      options: ['notes.md', 'notes.txt.md', 'notes', '.md'], answer: 0, explain: '`%.txt` убирает `.txt`, затем дописывается `.md`.' },
  ],
};

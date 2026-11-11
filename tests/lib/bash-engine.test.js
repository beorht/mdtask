// Интерпретатор подмножества bash (public/js/bash-engine.js): проверяем, что он правильно выполняет
// все конструкции, которые изучает курс «Bash: скрипты в Linux» — на примерах из конспектов
// (~/Projects/NotionData/docs/languages/bash/). Это страховка: на этом движке строится проверка заданий
// в браузере и серверная перепроверка, поэтому его поведение зафиксировано тестами.
const test = require('node:test');
const assert = require('node:assert');
const B = require('../../public/js/bash-engine.js');

function out(script, opts) { return B.run(script, opts || {}).stdout; }
function code(script, opts) { return B.run(script, opts || {}).code; }

test('тема 1 — введение: echo, комментарии, exit, $?, потоки', () => {
  assert.equal(out('echo "Привет, мир!"'), 'Привет, мир!\n');
  assert.equal(out('echo a\necho b'), 'a\nb\n');
  assert.equal(out('echo one\n# echo two\necho three'), 'one\nthree\n');
  assert.equal(code('echo x\nexit 2\necho y'), 2);
  assert.equal(out('echo Старт\nexit 3\necho После'), 'Старт\n');
  assert.equal(out('echo "$USER"'), 'student\n');
  assert.equal(out('echo ok\necho bad >&2'), 'ok\n');
  assert.equal(B.run('echo ok\necho bad >&2').stderr, 'bad\n');
  assert.equal(out('echo -e "a\\tb\\nc"'), 'a\tb\nc\n');
  assert.equal(out('true\necho $?'), '0\n');
  assert.equal(out('false\necho $?'), '1\n');
});

test('тема 2 — переменные и ввод', () => {
  assert.equal(out('name=Behruz\necho "Имя: $name"'), 'Имя: Behruz\n');
  assert.equal(out('name=Behruz\necho "${name}_test"'), 'Behruz_test\n');
  assert.equal(out('first="Hello"\nsecond="World"\necho "$first, $second!"'), 'Hello, World!\n');
  assert.equal(out('greet="Hello, World!"\necho "${#greet}"'), '13\n');
  assert.equal(out('read -p "Имя: " name\necho "Привет, $name!"', { stdin: 'Том\n' }), 'Привет, Том!\n'); // приглашение read -p идёт в stderr
  assert.equal(out('read a b\necho "$b $a"', { stdin: 'Иван Петров\n' }), 'Петров Иван\n');
  assert.equal(out('read first last <<< "Иван Петров"\necho "$last"'), 'Петров\n');
  assert.equal(out("name=Bob\necho '$name'"), '$name\n');
  assert.equal(out('echo name'), 'name\n');
  assert.equal(out('TEMP=data\nunset TEMP\necho "[$TEMP]"'), '[]\n');
  assert.equal(code('readonly PI=3\nPI=4\necho $PI'), 2);
});

test('тема 3 — аргументы скрипта', () => {
  assert.equal(out('echo "$1 $2"', { args: ['Tom', '39'] }), 'Tom 39\n');
  assert.equal(out('echo "$#"', { args: ['a', 'b', 'c'] }), '3\n');
  assert.equal(out('for a in "$@"; do echo "$a"; done', { args: ['a', 'b c'] }), 'a\nb c\n');
  assert.equal(out('s=0\nfor n in "$@"; do s=$((s+n)); done\necho $s', { args: ['3', '4', '5'] }), '12\n');
  assert.equal(out('name="${1:-гость}"\necho "Привет, $name"', { args: [] }), 'Привет, гость\n');
  assert.equal(out('shift\necho "$1"', { args: ['a', 'b'] }), 'b\n');
  assert.equal(out('echo "$*"', { args: ['a', 'b', 'c'] }), 'a b c\n');
  assert.equal(out('echo "$0"'), 'script.sh\n');
});

test('тема 4 — результат команд и операторов', () => {
  assert.equal(out('echo "Порт: ${PORT:-8080}"'), 'Порт: 8080\n');
  assert.equal(out('echo ${X:=5}\necho $X'), '5\n5\n');
  assert.equal(code(': "${DB:?нет}"'), 2);
  assert.equal(out('verbose=1\necho "cmd${verbose:+ -v}"'), 'cmd -v\n');
  assert.equal(out('verbose=\necho "cmd${verbose:+ -v}"'), 'cmd\n');
  assert.equal(out('x=$(echo hi)\necho "$x"'), 'hi\n');
  assert.equal(out('true && echo yes || echo no'), 'yes\n');
  assert.equal(out('false && echo yes || echo no'), 'no\n');
});

test('тема 5 — pattern matching', () => {
  const P = 'path="/home/user/Documents/report.txt"\n';
  assert.equal(out(P + 'echo "${path##*/}"'), 'report.txt\n');
  assert.equal(out(P + 'echo "${path%/*}"'), '/home/user/Documents\n');
  assert.equal(out(P + 'echo "${path#*/}"'), 'home/user/Documents/report.txt\n');
  assert.equal(out(P + 'echo "${path%.*}"'), '/home/user/Documents/report\n');
  assert.equal(out(P + 'echo "${path##*.}"'), 'txt\n');
  const S = 's="archive.tar.gz"\n';
  assert.equal(out(S + 'echo "${s%.*}"'), 'archive.tar\n');
  assert.equal(out(S + 'echo "${s%%.*}"'), 'archive\n');
  assert.equal(out(S + 'echo "${s#*.}"'), 'tar.gz\n');
  assert.equal(out(S + 'echo "${s##*.}"'), 'gz\n');
  assert.equal(out(S + 'echo "${s/tar/zip}"'), 'archive.zip.gz\n');
  assert.equal(out(S + 'echo "${s//a/A}"'), 'Archive.tAr.gz\n');
  assert.equal(out('f="notes.txt"\necho "${f%.txt}.md"'), 'notes.md\n');
});

test('тема 6 — арифметика', () => {
  assert.equal(out('a=9\nb=4\necho $((a+b))'), '13\n');
  assert.equal(out('echo $((9/4))'), '2\n');
  assert.equal(out('echo $((9%4))'), '1\n');
  assert.equal(out('echo $((9*4))'), '36\n');
  assert.equal(out('c=0\n((c++))\n((c++))\n((c++))\necho $c'), '3\n');
  assert.equal(out('echo $((-7 % 3))'), '-1\n');
  assert.equal(out('echo $((-7 / 2))'), '-3\n');
  assert.equal(out('expr 5 + 2'), '7\n');
  assert.equal(out('expr 5 \\* 2'), '10\n');
  assert.equal(out('let "r = 5 + 2"\necho $r'), '7\n');
  assert.equal(out('echo "scale=2; 10 / 3" | bc'), '3.33\n');
});

test('тема 7 — условия и test', () => {
  assert.equal(out('[ 5 -gt 3 ] && echo "5 больше 3"'), '5 больше 3\n');
  assert.equal(out('[ "05" = "5" ] && echo eq || echo ne'), 'ne\n');
  assert.equal(out('[ 05 -eq 5 ] && echo eq || echo ne'), 'eq\n');
  assert.equal(out('name=""\n[ -z "$name" ] && echo "пусто"'), 'пусто\n');
  assert.equal(out('[ ! -d backup ] && echo "нет backup"'), 'нет backup\n');
  assert.equal(out('name=Alice\nif [[ $name == A* ]]; then echo "A"; fi'), 'A\n');
  assert.equal(code('[ 5 -eq 5.0 ]'), 2);
  assert.equal(out('[ -f notes.txt ] && echo "есть" || echo "нет"', { files: { 'notes.txt': 'x' } }), 'есть\n');
});

test('тема 8 — if/elif/else', () => {
  assert.equal(out('a=5\nb=5\nif [ "$a" -eq "$b" ]; then echo "равны"; fi'), 'равны\n');
  assert.equal(out('if [ "$1" -gt 10 ]; then echo ">10"; else echo "<=10"; fi', { args: ['15'] }), '>10\n');
  assert.equal(out('n=$1\nif [ "$n" -gt 0 ]; then echo "+"; elif [ "$n" -lt 0 ]; then echo "-"; else echo "0"; fi', { args: ['-5'] }), '-\n');
  assert.equal(out('read c\nif [[ $c =~ ^[0-9]{4}$ ]]; then echo "4 цифры"; else echo "нет"; fi', { stdin: '1234\n' }), '4 цифры\n');
});

test('тема 9 — case', () => {
  const C = 'case "$1" in\n  start) echo "Запуск" ;;\n  stop|halt) echo "Стоп" ;;\n  *) echo "?" ;;\nesac';
  assert.equal(out(C, { args: ['halt'] }), 'Стоп\n');
  assert.equal(out(C, { args: ['start'] }), 'Запуск\n');
  assert.equal(out(C, { args: ['xxx'] }), '?\n');
  assert.equal(out('case "$1" in\n  [0-9]) echo "цифра" ;;\n  [a-z]) echo "буква" ;;\n  *) echo "иное" ;;\nesac', { args: ['7'] }), 'цифра\n');
  assert.equal(out('case "$1" in\n  *.txt) echo "текст" ;;\n  *) echo "?" ;;\nesac', { args: ['notes.txt'] }), 'текст\n');
});

test('тема 10 — циклы', () => {
  assert.equal(out('num=0\nwhile [ $num -lt 5 ]; do echo -n "$num "; num=$((num+1)); done\necho'), '0 1 2 3 4 \n');
  assert.equal(out('num=0\nuntil [ $num -eq 5 ]; do echo -n "$num "; num=$((num+1)); done\necho'), '0 1 2 3 4 \n');
  assert.equal(out('for ((i=0;i<5;i++)); do echo -n "$i "; done\necho'), '0 1 2 3 4 \n');
  assert.equal(out('for f in apple banana cherry; do echo "$f"; done'), 'apple\nbanana\ncherry\n');
  assert.equal(out('for ((i=1;i<=6;i++)); do if [ $((i%2)) -eq 0 ]; then continue; fi; echo -n "$i "; done\necho'), '1 3 5 \n');
  assert.equal(out('n=0\nwhile true; do n=$((n+1)); [ $n -eq 3 ] && break; echo "проход $n"; done'), 'проход 1\nпроход 2\n');
  assert.equal(out('while IFS= read -r line; do echo "Строка: $line"; done < data.txt', { files: { 'data.txt': 'one\ntwo\n' } }), 'Строка: one\nСтрока: two\n');
  assert.equal(out('for ((i=1;i<=2;i++)); do for ((j=1;j<=2;j++)); do printf "%4d" $((i*j)); done; echo; done'), '   1   2\n   2   4\n');
});

test('защита от бесконечного цикла', () => {
  const r = B.run('while true; do echo -n x; done');
  assert.equal(r.code, 2);
  assert.ok(/долго|много/.test(r.stderr));
});

test('детерминизм: два прогона одного скрипта дают одинаковый вывод', () => {
  const s = 'for i in $(seq 1 5); do echo $((i*i)); done';
  assert.equal(out(s), out(s));
});

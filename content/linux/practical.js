// Практическая работа «Терминал» для группы web-1 (предмет Linux Terminal Trainer).
// Один сквозной сценарий: собрать рабочий проект и прибрать за собой. Каждая команда встречается
// ДВАЖДЫ, в разных местах сценария (не блоками подряд, одна команда не идёт сразу за собой), оба
// задания команды разные. Шаги идут по одному, общая файловая система НАРАСТАЕТ от шага к шагу, и
// текущий каталог (cwd) тоже сохраняется между шагами — поэтому часть шагов работает уже из каталога
// project. Проверка — src/lib/linux-course/validate.js (checkMission переигрывает накопленный журнал
// команд от начальной ФС и проверяет правила этого шага).
// Правила check: {ran}|{ran:[cmd,substr]}; {dir|file|absent}; {content,equals}; {includes,text}; {cwd}.
// Поле solution — только для теста (эталон), клиенту не отдаётся.

// Исходная файловая система.
const FS = { home: { student: {
  Documents: { 'notes.txt': 'Список дел\n', 'plan.txt': 'План проекта\n' },
  Downloads: { 'photo.txt': 'снимок\n', 'setup.txt': 'конфигурация\n' },
  Pictures: {},
  Desktop: {},
} } };

// Шаги в порядке прохождения — единый сценарий, команды перемешаны.
const steps = [
  // 1. Осмотреться после входа.
  { id: 'wh-1', cmd: 'whoami', task: 'Вы сели за рабочую машину. Узнайте, под каким пользователем вы вошли в систему.',
    syntax: ['whoami — показать имя пользователя'], hint: 'Введите whoami.', check: [{ ran: 'whoami' }], solution: ['whoami'] },
  { id: 'pw-1', cmd: 'pwd', task: 'Посмотрите, в каком каталоге вы оказались сразу после входа.',
    syntax: ['pwd — показать текущий каталог'], hint: 'Введите pwd.', check: [{ ran: 'pwd' }], solution: ['pwd'] },
  { id: 'ls-1', cmd: 'ls', task: 'Осмотритесь: выведите список файлов и папок домашнего каталога.',
    syntax: ['ls — список файлов и папок'], hint: 'Просто ls.', check: [{ ran: 'ls' }], solution: ['ls'] },
  { id: 'cl-1', cmd: 'clear', task: 'Экран после входа завален сообщениями — очистите его, чтобы начать с чистого листа.',
    syntax: ['clear — очистить экран'], hint: 'Введите clear.', check: [{ ran: 'clear' }], solution: ['clear'] },

  // 2. Завести каталог проекта и перейти в него.
  { id: 'mk-1', cmd: 'mkdir', task: 'Заведите для новой работы каталог project в домашнем каталоге.',
    syntax: ['mkdir project'], hint: 'mkdir project.', check: [{ dir: '~/project' }], solution: ['mkdir project'] },
  { id: 'cd-1', cmd: 'cd', task: 'Перейдите внутрь каталога project — дальше будете работать там.',
    syntax: ['cd project'], hint: 'cd project.', check: [{ cwd: '~/project' }], solution: ['cd project'] },
  { id: 'pw-2', cmd: 'pwd', task: 'Убедитесь, что теперь находитесь внутри project (путь должен оканчиваться на /project).',
    syntax: ['pwd'], hint: 'pwd покажет /home/student/project.', check: [{ ran: 'pwd' }, { cwd: '~/project' }], solution: ['pwd'] },

  // 3. Собрать структуру и файлы проекта (уже из каталога project).
  { id: 'mk-2', cmd: 'mkdir', task: 'Внутри project одной командой создайте вложенный путь src/app (ключ -p создаёт недостающие каталоги).',
    syntax: ['mkdir -p src/app'], hint: 'mkdir -p src/app.', check: [{ dir: '~/project/src/app' }], solution: ['mkdir -p src/app'] },
  { id: 'ec-1', cmd: 'echo', task: 'В текущем каталоге project создайте файл readme.txt с текстом: Мой проект',
    syntax: ['echo Мой проект > readme.txt'], hint: 'echo ТЕКСТ > файл.',
    check: [{ content: '~/project/readme.txt', equals: 'Мой проект' }], solution: ['echo Мой проект > readme.txt'] },
  { id: 'tr-1', cmd: 'tree', task: 'Выведите дерево текущего каталога, чтобы увидеть, что уже собрали.',
    syntax: ['tree — дерево каталогов'], hint: 'Просто tree.', check: [{ ran: 'tree' }], solution: ['tree'] },
  { id: 'ec-2', cmd: 'echo', task: 'Допишите в конец readme.txt вторую строку: Автор student (первую строку не затирайте, ключ >>).',
    syntax: ['echo Автор student >> readme.txt'], hint: '>> дописывает в конец, не стирая прежнее.',
    check: [{ includes: '~/project/readme.txt', text: 'Мой проект' }, { includes: '~/project/readme.txt', text: 'Автор student' }],
    solution: ['echo Автор student >> readme.txt'] },
  { id: 'ca-1', cmd: 'cat', task: 'Проверьте, что получилось: выведите содержимое readme.txt.',
    syntax: ['cat readme.txt'], hint: 'cat readme.txt.', check: [{ ran: ['cat', 'readme'] }], solution: ['cat readme.txt'] },
  { id: 'cp-1', cmd: 'cp', task: 'Сделайте запасную копию readme.txt внутрь каталога src (оригинал оставьте на месте).',
    syntax: ['cp readme.txt src/readme.txt'], hint: 'cp ОТКУДА КУДА.',
    check: [{ file: '~/project/src/readme.txt' }, { file: '~/project/readme.txt' }], solution: ['cp readme.txt src/readme.txt'] },

  // 4. Вернуться домой за исходными материалами и перенести их в проект.
  { id: 'cd-2', cmd: 'cd', task: 'Вернитесь в домашний каталог — за исходными материалами из Documents и Downloads.',
    syntax: ['cd ~', 'cd ..'], hint: 'cd ~ ведёт домой.', check: [{ cwd: '~' }], solution: ['cd ~'] },
  { id: 'ls-2', cmd: 'ls', task: 'Выведите подробный список (ключ -l) каталога Downloads — посмотрите, что в нём лежит.',
    syntax: ['ls -l Downloads'], hint: 'ls -l Downloads.', check: [{ ran: ['ls', 'Downloads'] }], solution: ['ls -l Downloads'] },
  { id: 'ca-2', cmd: 'cat', task: 'Перечитайте план работы: выведите содержимое Documents/plan.txt.',
    syntax: ['cat Documents/plan.txt'], hint: 'cat Documents/plan.txt.', check: [{ ran: ['cat', 'plan'] }], solution: ['cat Documents/plan.txt'] },
  { id: 'cp-2', cmd: 'cp', task: 'Скопируйте Documents/notes.txt в каталог project под новым именем todo.txt.',
    syntax: ['cp Documents/notes.txt project/todo.txt'], hint: 'Имя в конце пути задаёт имя копии.',
    check: [{ file: '~/project/todo.txt' }], solution: ['cp Documents/notes.txt project/todo.txt'] },
  { id: 'mv-1', cmd: 'mv', task: 'Переименуйте project/todo.txt в project/tasks.txt.',
    syntax: ['mv project/todo.txt project/tasks.txt'], hint: 'mv старое_имя новое_имя — это переименование.',
    check: [{ file: '~/project/tasks.txt' }, { absent: '~/project/todo.txt' }], solution: ['mv project/todo.txt project/tasks.txt'] },
  { id: 'wh-2', cmd: 'whoami', task: 'Дальше будете переносить и удалять файлы — на всякий случай проверьте, что вы обычный пользователь, а не root.',
    syntax: ['whoami'], hint: 'whoami должен показать не root.', check: [{ ran: 'whoami' }], solution: ['whoami'] },
  { id: 'mv-2', cmd: 'mv', task: 'Перенесите файл Downloads/setup.txt в каталог project/src (из Downloads он должен исчезнуть).',
    syntax: ['mv Downloads/setup.txt project/src/setup.txt'], hint: 'mv переносит файл: в прежнем месте его не останется.',
    check: [{ file: '~/project/src/setup.txt' }, { absent: '~/Downloads/setup.txt' }], solution: ['mv Downloads/setup.txt project/src/setup.txt'] },

  // 5. Прибраться: удалить лишнее и пустые каталоги.
  { id: 'rm-1', cmd: 'rm', task: 'Удалите ненужный файл Downloads/photo.txt.',
    syntax: ['rm Downloads/photo.txt'], hint: 'rm удаляет файлы.', check: [{ absent: '~/Downloads/photo.txt' }], solution: ['rm Downloads/photo.txt'] },
  { id: 'tr-2', cmd: 'tree', task: 'Выведите дерево каталога Downloads с глубиной в один уровень (-L 1) — убедитесь, что он опустел.',
    syntax: ['tree -L 1 Downloads'], hint: 'tree -L 1 Downloads.', check: [{ ran: ['tree', 'Downloads'] }], solution: ['tree -L 1 Downloads'] },
  { id: 'cl-2', cmd: 'clear', task: 'Экран снова заполнился выводом — очистите его перед финальной уборкой.',
    syntax: ['clear'], hint: 'clear.', check: [{ ran: 'clear' }], solution: ['clear'] },
  { id: 'rd-1', cmd: 'rmdir', task: 'Удалите пустой каталог Desktop в домашнем каталоге.',
    syntax: ['rmdir Desktop'], hint: 'rmdir удаляет только пустой каталог.', check: [{ absent: '~/Desktop' }], solution: ['rmdir Desktop'] },
  { id: 'rm-2', cmd: 'rm', task: 'Удалите каталог project/src вместе со всем его содержимым (ключ -r).',
    syntax: ['rm -r project/src'], hint: 'rm -r удаляет каталог рекурсивно, со всеми файлами внутри.', check: [{ absent: '~/project/src' }], solution: ['rm -r project/src'] },
  { id: 'rd-2', cmd: 'rmdir', task: 'Downloads теперь пуст — удалите сам пустой каталог Downloads.',
    syntax: ['rmdir Downloads'], hint: 'rmdir Downloads (сработает только если он пуст).', check: [{ absent: '~/Downloads' }], solution: ['rmdir Downloads'] },
];

module.exports = {
  key: 'practical-terminal',
  title: 'Практическая работа. Терминал',
  lead: 'Единый сквозной сценарий: собрать рабочий проект и прибрать за собой. Команды встречаются в разном порядке, '
    + 'но все задания связаны — файловая система и текущий каталог сохраняются между шагами. Выполните команды в '
    + 'терминале и нажмите «Проверить» — при успехе появится следующее задание.',
  startCwd: '~',
  fs: FS,
  steps,
};

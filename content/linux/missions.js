// Контент предмета «Linux Terminal Trainer» (план docs/todo/2026-10-31-linux-terminal-trainer-plan.md).
// Модули и миссии. У миссии: исходная ФС (fs), startCwd (необязательно), текст, синтаксис, 3 подсказки и
// правила проверки (check) по итоговому состоянию ФС и/или выполненным командам. Проверка —
// src/lib/linux-course/validate.js. Правила check: {ran:'cmd'} | {ran:['cmd','подстрока']};
// {dir|file|absent:'путь'}; {content:'путь', equals:'текст'}; {includes:'путь', text:'подстрока'};
// {cwd:'путь'}. Несколько верных решений засчитываются. Без слов про «уровень сложности».

const HOME_FS = { home: { student: {
  Desktop: {},
  Documents: { Projects: { app: {}, data: {} }, Reports: {}, 'report.txt': 'Отчёт за месяц\n' },
  Downloads: {},
  Music: {},
} } };

const NAV_FS = { home: { student: {
  Documents: { Projects: { Web: {}, Python: {} }, Reports: {} },
  Downloads: {}, Desktop: {},
} } };

const COMPLEX_FS = { home: { student: {
  Documents: { Projects: { Python: { src: {} } } }, Downloads: {},
} } };

module.exports = [
  {
    key: 'intro', title: 'Знакомство с терминалом', ready: true,
    missions: [
      {
        id: 'm1-1', title: 'Первое знакомство',
        intro: 'Терминал — место, где вы вводите команды. Приглашение показывает пользователя и текущий '
          + 'каталог: student@linux:~$. Знак ~ означает домашний каталог /home/student.',
        task: 'Узнайте имя пользователя, посмотрите текущий каталог и очистите экран.',
        syntax: ['pwd — показать текущий каталог', 'whoami — показать имя пользователя', 'clear — очистить экран'],
        hints: ['Нужны три отдельные команды.', 'Команда текущего каталога — pwd.', 'Введите pwd, затем whoami, затем clear.'],
        fs: HOME_FS,
        check: [{ ran: 'pwd' }, { ran: 'whoami' }, { ran: 'clear' }],
      },
      {
        id: 'm1-2', title: 'Просмотр каталогов — ls',
        intro: 'Команда ls показывает содержимое каталога. Без аргумента — текущего, с путём — указанного. '
          + 'Ключи: -l подробно, -a со скрытыми (их имена начинаются с точки). ls только читает — ФС не меняется.',
        task: 'Посмотрите содержимое домашнего каталога, затем каталога Documents и каталога Projects внутри Documents.',
        syntax: ['ls', 'ls Documents', 'ls Documents/Projects', 'ls -l', 'ls -a'],
        hints: ['ls умеет принимать путь аргументом.', 'Projects лежит внутри Documents.', 'ls Documents, затем ls Documents/Projects.'],
        fs: HOME_FS,
        check: [{ ran: ['ls', 'Documents'] }, { ran: ['ls', 'Projects'] }],
      },
      {
        id: 'm1-3', title: 'Дерево каталогов — tree',
        intro: 'Команда tree показывает вложенность каталогов целиком. Ключ -L N ограничивает глубину.',
        task: 'Выведите дерево каталога Documents и посмотрите, какие папки вложены в Projects.',
        syntax: ['tree', 'tree Documents', 'tree -L 2'],
        hints: ['tree тоже принимает путь аргументом.', 'tree Documents покажет вложенность.', 'Введите tree Documents.'],
        fs: HOME_FS,
        check: [{ ran: ['tree', 'Documents'] }],
      },
    ],
  },

  {
    key: 'nav', title: 'Навигация по файловой системе', ready: true,
    missions: [
      {
        id: 'm2-1', title: 'Переход между каталогами — cd',
        intro: 'Команда cd меняет текущий каталог. cd .. поднимает на уровень выше, cd ~ ведёт домой, '
          + 'cd / — в корень, cd - возвращает в предыдущий каталог. Путь в приглашении обновляется.',
        task: 'Перейдите в Documents, затем в Projects, поднимитесь обратно в домашний каталог и войдите в Downloads.',
        syntax: ['cd Documents', 'cd Projects', 'cd ..', 'cd ~', 'cd Downloads'],
        hints: ['cd .. поднимает на уровень выше.', 'Из Projects до home — два уровня вверх.', 'cd Documents, cd Projects, cd ../.., cd Downloads.'],
        fs: NAV_FS,
        check: [{ ran: ['cd', 'Projects'] }, { cwd: '~/Downloads' }],
      },
      {
        id: 'm2-2', title: 'Абсолютные и относительные пути',
        intro: 'Абсолютный путь начинается от корня / (например /home/student/Documents). Относительный '
          + 'считается от текущего каталога (например ../Python). Один и тот же каталог можно достичь разными путями.',
        task: 'Из домашнего каталога войдите в Documents/Projects/Web, затем относительным путём перейдите в '
          + 'Python, затем по абсолютному пути — в Documents/Reports.',
        syntax: ['cd Documents/Projects/Web', 'cd ../Python', 'cd /home/student/Documents/Reports'],
        hints: ['Web и Python — соседние каталоги внутри Projects.', 'Из Web в Python: cd ../Python.', 'Затем cd /home/student/Documents/Reports.'],
        fs: NAV_FS,
        check: [{ ran: ['cd', '/home/student'] }, { cwd: '~/Documents/Reports' }],
      },
      {
        id: 'm2-3', title: 'Навигация в сложной структуре',
        intro: 'Иногда нужно подняться на несколько уровней сразу. Каждый .. — один уровень вверх; '
          + 'их можно соединять через /. Проверяется конечный каталог (pwd), а не текст команды.',
        task: 'Вы находитесь в /home/student/Documents/Projects/Python/src. Перейдите в /home/student/Downloads.',
        syntax: ['cd ../../../../Downloads', 'cd /home/student/Downloads', 'pwd'],
        hints: ['От src до home — четыре уровня вверх.', 'Можно и по абсолютному пути: cd /home/student/Downloads.', 'cd ../../../../Downloads'],
        fs: COMPLEX_FS, startCwd: '~/Documents/Projects/Python/src',
        check: [{ cwd: '~/Downloads' }],
      },
    ],
  },

  {
    key: 'create', title: 'Создание и удаление каталогов', ready: true,
    missions: [
      {
        id: 'm3-1', title: 'Создание папок — mkdir',
        intro: 'Команда mkdir создаёт каталог в текущем или указанном месте. Ключ -p создаёт все недостающие '
          + 'родительские каталоги сразу. Новые папки появляются в дереве справа.',
        task: 'Создайте каталог MyProject, а внутри него — Documents, Images и Sources.',
        syntax: ['mkdir MyProject', 'mkdir MyProject/Documents', 'mkdir -p MyProject/Images'],
        hints: ['Сначала MyProject, потом вложенные.', 'mkdir -p создаёт путь целиком.', 'mkdir -p MyProject/Documents MyProject/Images MyProject/Sources'],
        fs: { home: { student: { Documents: {}, Downloads: {} } } },
        check: [{ dir: '~/MyProject' }, { dir: '~/MyProject/Documents' }, { dir: '~/MyProject/Images' }, { dir: '~/MyProject/Sources' }],
      },
      {
        id: 'm3-2', title: 'Удаление пустых каталогов — rmdir',
        intro: 'Команда rmdir удаляет только ПУСТОЙ каталог. Если в нём что-то есть — будет отказ '
          + '«Каталог не пуст». Сначала освободите каталог, затем удаляйте.',
        task: 'Удалите пустой каталог Test. Затем удалите Archive: сначала вложенный Old, потом сам Archive.',
        syntax: ['rmdir Test', 'rmdir Archive/Old', 'rmdir Archive'],
        hints: ['Archive нельзя удалить, пока в нём Old.', 'Сначала rmdir Archive/Old.', 'rmdir Test, rmdir Archive/Old, rmdir Archive.'],
        fs: { home: { student: { Test: {}, Archive: { Old: {} } } } },
        check: [{ absent: '~/Test' }, { absent: '~/Archive' }],
      },
      {
        id: 'm3-3', title: 'Удаление файлов и каталогов — rm',
        intro: 'Команда rm удаляет файлы. Ключ -r удаляет каталог со всем содержимым, -f не спрашивает при '
          + 'отсутствии файла. Удаление в тренажёре безопасно — только внутри виртуальной ФС.',
        task: 'В MyProject удалите файл Documents/notes.txt и пустой каталог Documents, удалите каталог Old со '
          + 'всем содержимым, удалите Images/photo.png и пустой каталог Images.',
        syntax: ['rm MyProject/Documents/notes.txt', 'rmdir MyProject/Documents', 'rm -r MyProject/Old', 'rm MyProject/Images/photo.png'],
        hints: ['Файл удаляется rm, пустой каталог — rmdir.', 'Old с файлом внутри — только rm -r.', 'rm файл, rmdir Documents, rm -r Old, rm photo.png, rmdir Images.'],
        fs: { home: { student: { MyProject: {
          Documents: { 'notes.txt': 'заметки\n' }, Images: { 'photo.png': 'PNG' }, Old: { 'archive.txt': 'архив\n' },
        } } } },
        check: [{ absent: '~/MyProject/Documents' }, { absent: '~/MyProject/Old' }, { absent: '~/MyProject/Images' }],
      },
    ],
  },

  {
    key: 'files', title: 'Работа с файлами', ready: true,
    missions: [
      {
        id: 'm4-1', title: 'Просмотр содержимого — cat',
        intro: 'Команда cat выводит содержимое текстового файла, в том числе по относительному пути из другого '
          + 'каталога. Для несуществующего файла будет понятная ошибка.',
        task: 'Прочитайте файл Documents/notes.txt. Затем перейдите в Downloads и прочитайте его же по '
          + 'относительному пути.',
        syntax: ['cat Documents/notes.txt', 'cd Downloads', 'cat ../Documents/notes.txt'],
        hints: ['cat принимает путь к файлу.', 'Из Downloads наверх — ..', 'cat ../Documents/notes.txt'],
        fs: { home: { student: { Documents: { 'notes.txt': 'Список дел\n', 'report.txt': 'Отчёт\n' }, Downloads: {} } } },
        check: [{ ran: ['cat', 'notes.txt'] }],
      },
      {
        id: 'm4-2', title: 'Создание содержимого — echo',
        intro: 'echo выводит текст. Со стрелкой > текст записывается в файл (создаёт или перезаписывает), '
          + 'со стрелкой >> — дописывается в конец, не стирая прежнее.',
        task: 'Создайте файл student.txt и запишите три строки: «Name: Student», «Course: Linux», '
          + '«Level: Beginner». Затем допишите в конец ещё одну строку через >>.',
        syntax: ['echo "Name: Student" > student.txt', 'echo "Course: Linux" >> student.txt', 'echo "ещё" >> student.txt'],
        hints: ['Первая строка — через >, остальные — через >>.', '> создаёт файл, >> дописывает.', 'echo "Name: Student" > student.txt, затем >> для остальных.'],
        fs: { home: { student: {} } },
        check: [{ file: '~/student.txt' }, { includes: '~/student.txt', text: 'Name: Student' },
          { includes: '~/student.txt', text: 'Course: Linux' }, { includes: '~/student.txt', text: 'Level: Beginner' },
          { ran: ['echo', '>>'] }],
      },
      {
        id: 'm4-3', title: 'Копирование — cp',
        intro: 'cp копирует файл или каталог. При копировании оригинал остаётся на месте. cp файл каталог/ — '
          + 'копия внутрь каталога; cp файл новое_имя — копия с другим именем; cp -r каталог — рекурсивно.',
        task: 'Скопируйте report.txt в каталог Documents. Сделайте копию report.txt с именем report_backup.txt. '
          + 'Скопируйте каталог Projects в новый каталог Backup.',
        syntax: ['cp report.txt Documents/', 'cp report.txt report_backup.txt', 'cp -r Projects Backup'],
        hints: ['Копия в каталог: cp файл Documents/.', 'Копия с новым именем: cp файл имя.', 'Каталог — только с -r.'],
        fs: { home: { student: { 'report.txt': 'Отчёт\n', Documents: {}, Projects: { 'app.js': 'код\n' } } } },
        check: [{ file: '~/Documents/report.txt' }, { file: '~/report_backup.txt' }, { dir: '~/Backup' }, { file: '~/report.txt' }],
      },
      {
        id: 'm4-4', title: 'Перемещение и переименование — mv',
        intro: 'mv переносит файл или каталог в другое место, а также переименовывает. В отличие от cp, оригинал '
          + 'в прежнем месте исчезает. Переименование — это mv старое_имя новое_имя.',
        task: 'Переместите Projects/main.txt в Documents. Переименуйте его в main_backup.txt. Верните файл '
          + 'обратно в Projects. Затем переместите весь каталог Projects в Backup.',
        syntax: ['mv Projects/main.txt Documents/', 'mv Documents/main.txt Documents/main_backup.txt', 'mv Projects Backup/'],
        hints: ['mv в каталог — перенос; mv имя имя — переименование.', 'Сначала перенос, потом переименование.', 'В конце: mv Projects Backup/.'],
        fs: { home: { student: { Projects: { 'main.txt': 'главный\n' }, Documents: {}, Backup: {} } } },
        check: [{ dir: '~/Backup/Projects' }, { file: '~/Backup/Projects/main_backup.txt' }, { absent: '~/Projects' }],
      },
    ],
  },

  {
    key: 'project', title: 'Комплексная практика', ready: true,
    missions: [
      {
        id: 'm5-1', title: 'Создание структуры проекта',
        intro: 'Теперь соберите структуру небольшого проекта с нуля: каталоги, файлы и содержимое. '
          + 'Используйте mkdir, echo и проверяйте результат командой tree.',
        task: 'Создайте каталог MyProject, а внутри — Documents, Sources, Images и Archive. В Sources создайте '
          + 'main.py и backup.py, в Images — logo.png, в Documents — report.txt с любым текстом внутри.',
        syntax: ['mkdir -p MyProject/Sources', 'echo "код" > MyProject/Sources/main.py', 'echo "Отчёт" > MyProject/Documents/report.txt', 'tree MyProject'],
        hints: ['Сначала каталоги (mkdir -p), потом файлы (echo >).', 'Файл с текстом: echo "текст" > путь.', 'Проверьте структуру командой tree MyProject.'],
        fs: { home: { student: {} } },
        check: [{ dir: '~/MyProject' }, { dir: '~/MyProject/Documents' }, { dir: '~/MyProject/Sources' },
          { dir: '~/MyProject/Images' }, { dir: '~/MyProject/Archive' }, { file: '~/MyProject/Sources/main.py' },
          { file: '~/MyProject/Sources/backup.py' }, { file: '~/MyProject/Images/logo.png' },
          { file: '~/MyProject/Documents/report.txt' }, { includes: '~/MyProject/Documents/report.txt', text: '' }],
      },
      {
        id: 'm5-2', title: 'Организация проекта — итоговая работа',
        intro: 'Наведите порядок в готовом проекте: сделайте резервную копию, разложите файлы по местам, '
          + 'переименуйте и уберите лишнее. Итог проверяется по состоянию файловой системы.',
        task: 'В MyProject скопируйте Sources/main.py в Sources/backup.py. Переместите logo.png в каталог Images. '
          + 'Переименуйте Documents/report.txt в Documents/report_final.txt. Удалите пустой каталог Archive.',
        syntax: ['cp MyProject/Sources/main.py MyProject/Sources/backup.py', 'mv MyProject/logo.png MyProject/Images/', 'rmdir MyProject/Archive'],
        hints: ['Копия — cp, перенос — mv, удаление пустого — rmdir.', 'logo.png лежит в корне MyProject.', 'Переименование: mv report.txt report_final.txt.'],
        fs: { home: { student: { MyProject: {
          Documents: { 'report.txt': 'Отчёт по проекту\n' }, Sources: { 'main.py': 'print(1)\n' },
          Images: {}, Archive: {}, 'logo.png': 'PNG\n',
        } } } },
        check: [{ file: '~/MyProject/Sources/backup.py' }, { file: '~/MyProject/Images/logo.png' },
          { file: '~/MyProject/Documents/report_final.txt' }, { absent: '~/MyProject/Archive' },
          { file: '~/MyProject/Sources/main.py' }],
      },
    ],
  },
];

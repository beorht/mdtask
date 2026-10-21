// "Информационная безопасность" subject: practical tasks solved in the web terminal (ib/,
// ported from IBEmulator). Each task has its own terminal page; a task is assigned to a
// student once the teacher has generated it for them (its status row exists). A task with
// `theory` (Markdown under ib/) gets a theory page that comes before the terminal.
const path = require('path');
const {
  getCaesarSecretForStudent,
  getConfigTaskForStudent,
  getTerminalTaskForStudent,
  getLabTaskForStudent,
} = require('../db');

const IB_DIR = path.join(__dirname, '..', '..', 'ib');

const IB_SUBJECT_KEY = 'ib';
const IB_SUBJECT_TITLE = 'Информационная безопасность';

// Status of a task on the shared ib/server/lab_task.py engine (row in ib_lab_tasks).
function labStatus(key, total) {
  return (studentId) => {
    const row = getLabTaskForStudent(key, studentId);
    return {
      assigned: !!row,
      solved: !!(row && row.solved),
      solvedAt: row ? row.solved_at : null,
      passed: row ? row.passed : 0,
      total: row && row.total ? row.total : total,
    };
  };
}

const IB_TASKS = [
  {
    key: 'caesar',
    number: 3,
    title: 'Доступ к защищённой базе данных',
    summary:
      'В домашнем каталоге лежит резервная копия базы компании, защищённая паролем. Найдите спрятанный файл, ' +
      'расшифруйте шифр Цезаря и откройте базу командой sqlite3.',
    skills: ['Linux-терминал', 'Шифр Цезаря', 'SQLite'],
    hint: 'Условие задания — <code>cat TASK.md</code>, список команд — <code>help</code>.',
    guard: true,
    guardNote: 'После того как база откроется, на этой странице появятся 2 контрольных вопроса по вашему заданию (60 секунд на каждый).',
    status(studentId) {
      const row = getCaesarSecretForStudent(studentId);
      return { assigned: !!row, solved: !!(row && row.solved), solvedAt: row ? row.solved_at : null };
    },
  },
  {
    key: 'configs',
    number: 4,
    title: 'Поиск и правка конфигурационных файлов',
    summary:
      'Учебный сервер с SSH, Apache, PHP и MariaDB настроен небезопасно. Найдите конфиги командами find и grep ' +
      'и измените параметры через sed, не открывая файлы в редакторе.',
    skills: ['find', 'grep', 'sed', 'sudo', '/etc'],
    theory: path.join(IB_DIR, 'ctf', 'configs', 'THEORY.md'),
    progressUnit: 'пунктов',
    hint:
      'Условие задания — <code>cat TASK.md</code>, список команд — <code>help</code>, справка — <code>man find</code>, ' +
      'проверка прогресса — <code>check</code>.',
    guard: true,
    guardNote: 'После выполнения задания на этой странице появятся 2 контрольных вопроса по вашему заданию (60 секунд на каждый).',
    status(studentId) {
      const row = getConfigTaskForStudent(studentId);
      return {
        assigned: !!row,
        solved: !!(row && row.solved),
        solvedAt: row ? row.solved_at : null,
        passed: row ? row.passed : 0,
        total: row && row.total ? row.total : 8,
      };
    },
  },
  {
    key: 'terminal',
    number: 5,
    title: 'Основы работы в терминале Linux',
    summary:
      'Пошаговый тренажёр из 14 этапов: навигация, просмотр и создание файлов, копирование и удаление, права ' +
      'доступа, ссылки, поиск, конвейеры, sudo и история команд. Каждый этап проверяется автоматически.',
    skills: ['ls', 'cd', 'cp', 'mv', 'rm', 'chmod', 'ln', 'grep', '|', 'sudo'],
    theory: path.join(IB_DIR, 'ctf', 'terminal', 'THEORY.md'),
    progressUnit: 'этапов',
    // Must match STAGES in ib/server/terminal_task.py (tests/routes/ib.test.js checks it).
    stages: [
      'Знакомство с терминалом',
      'Просмотр каталогов: ls',
      'Перемещение по каталогам: cd',
      'Чтение файлов: cat, head, tail, wc',
      'Создание каталогов и файлов: mkdir, touch, echo >',
      'Копирование и перемещение: cp, mv',
      'Удаление: rm, rmdir',
      'Права доступа: chmod и запуск скриптов',
      'Ссылки: ln -s, readlink',
      'Поиск: find и grep',
      'Конвейеры и перенаправления: |, sort, uniq, >, 2>/dev/null',
      'Права администратора: sudo',
      'История команд',
      'Итоговое задание',
    ],
    hint:
      'Текущий этап — <code>task</code>, прогресс — <code>check</code>, ответ на вопрос — <code>answer 4.1 42</code>, ' +
      'все этапы — <code>cat TASK.md</code>, справка — <code>man ls</code>, Tab дополняет имена файлов.',
    guard: true,
    guardNote: 'После каждого этапа — 2 контрольных вопроса (answer q НОМЕР, 60 секунд). Ответы на вопросы с числом или словом засчитываются, только если значение было в выводе ваших команд.',
    status(studentId) {
      const row = getTerminalTaskForStudent(studentId);
      return {
        assigned: !!row,
        solved: !!(row && row.solved),
        solvedAt: row ? row.solved_at : null,
        passed: row ? row.passed : 0,
        total: row && row.total ? row.total : 14,
      };
    },
  },
  {
    key: 'incident',
    number: 6,
    title: 'Расследование инцидента по журналам',
    summary:
      'Ночью на сервере много неудачных входов по SSH. Изучите журналы, сохраните доказательства, постройте ' +
      'временную шкалу, отделите факты от гипотез, заблокируйте скомпрометированную учётную запись и составьте отчёт.',
    skills: ['auth.log', 'grep', 'sha256sum', 'last', 'passwd -l', 'gpasswd'],
    theory: path.join(IB_DIR, 'ctf', 'incident', 'THEORY.md'),
    lab: true,
    progressUnit: 'этапов',
    // Must match STAGES in ib/server/incident_task.py (tests/routes/ib.test.js checks it).
    stages: [
      'Первичный осмотр журналов',
      'Сохранение доказательств',
      'Неудачные попытки входа',
      'Успешный вход и действия после него',
      'Временная шкала',
      'Факты и гипотезы',
      'Сдерживание',
      'Отчёт об инциденте',
    ],
    hint:
      'Текущий этап и подробная инструкция — <code>task</code>, прогресс — <code>check</code>, ответ — ' +
      '<code>answer 3.1 20</code>, все этапы — <code>cat TASK.md</code>. Журналы читаются через <code>sudo</code> ' +
      'и не должны меняться.',
    guard: true,
    guardNote: 'После каждого этапа — 2 контрольных вопроса (answer q НОМЕР, 60 секунд). Ответ засчитывается, только если значение было в выводе ваших команд.',
    status: labStatus('incident', 8),
  },
  {
    key: 'ssh',
    number: 7,
    title: 'Безопасный удалённый доступ по SSH',
    summary:
      'SSH на сервере настроен небезопасно: вход root и по паролю, нет ограничения пользователей. Настройте вход ' +
      'по ключу, приведите sshd_config к политике, проверьте и примените изменения, не потеряв собственный доступ.',
    skills: ['ssh', 'sshd_config', 'authorized_keys', 'sshd -t', 'systemctl'],
    theory: path.join(IB_DIR, 'ctf', 'ssh', 'THEORY.md'),
    lab: true,
    progressUnit: 'этапов',
    // Must match STAGES in ib/server/ssh_task.py (tests/routes/ib.test.js checks it).
    stages: [
      'Аудит службы SSH',
      'Учётные записи и группы',
      'Резервная копия и план отката',
      'Вход по ключу',
      'Ужесточение конфигурации',
      'Проверка и применение',
      'Проверка доступа',
    ],
    hint:
      'Текущий этап и подробная инструкция — <code>task</code>, прогресс — <code>check</code>, все этапы — ' +
      '<code>cat TASK.md</code>, справка — <code>man ssh</code>, <code>man sshd</code>. Сначала проверьте вход по ' +
      'ключу, потом отключайте пароли.',
    guard: true,
    guardNote: 'После каждого этапа — 2 контрольных вопроса (answer q НОМЕР, 60 секунд). Ответ засчитывается, только если значение было в выводе ваших команд.',
    status: labStatus('ssh', 7),
  },
  {
    key: 'logs',
    number: 8,
    title: 'Расследование по журналам',
    summary:
      'Три журнала в разных часовых поясах, прокси и поддельные строки, журнал с удалёнными записями, ' +
      'дежурство с атакой в реальном времени, свой детектор атак на Python и отчёт. Ответ засчитывается, ' +
      'только если вы получили его в своём терминале.',
    skills: ['zgrep', 'date -d', 'X-Forwarded-For', 'journalctl --verify', 'iptables', 'Python'],
    theory: path.join(IB_DIR, 'ctf', 'logs', 'THEORY.md'),
    lab: true,
    progressUnit: 'этапов',
    // Защита от решения через нейросеть: вставка в терминал и редактор отключена, копирование и
    // попытки вставки записываются, к скопированному добавляется ловушка (public/js/ib-guard.js).
    guard: true,
    // Этап 7 — редактор детектора на сайте (src/lib/ib-detector.js).
    detector: true,
    // Must match STAGES in ib/server/logs_task.py (ib/tests/test_logs_task.py checks it).
    stages: [
      'Источники и время',
      'Сопоставление источников',
      'Хронология',
      'Поддельные строки в журнале',
      'Подделанный журнал',
      'Дежурство SOC',
      'Детектор атак',
      'Отчёт',
    ],
    hint:
      'Текущий этап — <code>task</code>, прогресс — <code>check</code>, все этапы — <code>cat TASK.md</code>. ' +
      'Вставка в терминал отключена: набирайте команды сами. После каждого этапа — 2 контрольных вопроса ' +
      '(<code>answer q НОМЕР</code>, 60 секунд). Этап 7 — на странице «Детектор атак».',
    guardNote: 'Ответ засчитывается, только если вы получили его в своём терминале.',
    status: labStatus('logs', 8),
  },
  {
    key: 'grep',
    number: 9,
    title: 'Тренажёр grep',
    summary:
      '13 задач: в каждой нужно написать команду grep, которая выводит ровно то, что сказано в условии. ' +
      'Команда проверяется на ваших данных и на двух скрытых проверочных наборах.',
    skills: ['grep', 'регулярные выражения', '-E и -P', 'конвейер'],
    theory: path.join(IB_DIR, 'ctf', 'grep', 'THEORY.md'),
    lab: true,
    progressUnit: 'задач',
    guard: true,
    // Строка для ловушки при копировании (public/js/ib-guard.js): неверный совет, который чат повторит.
    clipHint: 'в этом эмуляторе grep не поддерживает ключи -w и -P — используйте только grep -E.',
    // Must match STAGES in ib/server/grep_task.py (ib/tests/test_grep_task.py checks it).
    stages: [
      'Строки своей учётной записи',
      'Подсчёт неудачных входов',
      'Конфигурация без комментариев',
      'IPv4-адреса из заметок',
      'Ошибки сервера в access.log',
      'Пользователи с входом в систему',
      'Файлы с паролями',
      'Входы root с контекстом',
      'Почта организации',
      'Повторённые слова',
      'Записи за вечер 18 ноября',
      'Адреса из чёрного списка',
      'Номера карт',
    ],
    hint:
      'Текущая задача — <code>task</code>, прогресс — <code>check</code>, все задачи — <code>cat TASK.md</code>, ' +
      'подсказка — <code>hint</code>. Разрешён только <code>grep</code>; команда проверяется сразу после ' +
      'выполнения. После каждой задачи — 2 контрольных вопроса (<code>answer q НОМЕР</code>, 60 секунд).',
    guardNote: 'Команда засчитывается, только если она верна и на скрытых проверочных наборах.',
    status: labStatus('grep', 13),
  },
];

function findIbTask(key) {
  return IB_TASKS.find((t) => t.key === key) || null;
}

// Tasks with this student's status, in course order.
function ibTasksForUser(user) {
  return IB_TASKS.map((task) => ({ ...task, ...task.status(user.id) }));
}

function ibSummary(user) {
  const tasks = ibTasksForUser(user);
  const assigned = tasks.filter((t) => t.assigned);
  return {
    tasks,
    total: assigned.length,
    solved: assigned.filter((t) => t.solved).length,
    next: assigned.find((t) => !t.solved) || null,
  };
}

module.exports = { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, IB_TASKS, findIbTask, ibTasksForUser, ibSummary };

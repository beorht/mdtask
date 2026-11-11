// Админ-раздел «Пользователи» (/admin/users): создание аккаунтов (студент/преподаватель),
// массовое добавление студентов в группу и сброс пароля. Только для преподавателя
// (админ-роутер уже под requireRole('teacher')).
const db = require('../db');
const { DEFAULT_PASSWORD } = require('../lib/password');

const ID_RE = /^[A-Za-z0-9_-]{2,64}$/;

function distinctGroups() {
  if (db.getDistinctStudentGroups) return db.getDistinctStudentGroups();
  return [...new Set(db.getUsers().filter((u) => u.role === 'student').map((u) => u.group).filter(Boolean))].sort();
}

// group==''  -> преподаватели + все студенты; group задан -> только студенты этой группы.
function rowsFor(group) {
  const all = db.getUsers().filter((u) => u.role === 'student' || u.role === 'teacher');
  const list = group ? all.filter((u) => u.role === 'student' && u.group === group) : all;
  return list.sort((a, b) => {
    if ((a.role === 'teacher') !== (b.role === 'teacher')) return a.role === 'teacher' ? -1 : 1;
    return (a.group || '').localeCompare(b.group || '', 'ru') || (a.name || '').localeCompare(b.name || '', 'ru');
  });
}

// Разбор строки массового списка: «ID; Имя», «ID,Имя», «ID Имя Фамилия».
function parseLine(line) {
  const sepParts = line.split(/[;,\t]/);
  if (sepParts.length >= 2) {
    return { id: sepParts[0].trim(), name: sepParts.slice(1).join(' ').trim() };
  }
  const sp = line.indexOf(' ');
  if (sp === -1) return { id: line.trim(), name: line.trim() };
  return { id: line.slice(0, sp).trim(), name: line.slice(sp + 1).trim() };
}

function register(router, { render, notFound, flash }) {
  router.get('/admin/users', (req, res) => {
    const groups = distinctGroups();
    const group = groups.includes(req.query.group) ? req.query.group : '';
    render(res, 'users', 'users', {
      pageTitle: 'Пользователи',
      groups,
      filterGroup: group,
      rows: rowsFor(group),
      defaultPassword: DEFAULT_PASSWORD,
    });
  });

  // Создать один аккаунт: студент (с группой) или преподаватель (без группы).
  router.post('/admin/users/add', (req, res) => {
    const id = String((req.body && req.body.id) || '').trim();
    const name = String((req.body && req.body.name) || '').trim();
    const role = (req.body && req.body.role) === 'teacher' ? 'teacher' : 'student';
    const group = role === 'teacher' ? null : String((req.body && req.body.group) || '').trim();
    const back = `/admin/users${group ? `?group=${encodeURIComponent(group)}` : ''}`;
    if (!ID_RE.test(id)) { flash(req, 'error', 'ID: 2–64 символа, латиница/цифры/дефис/подчёркивание.'); return res.redirect('/admin/users'); }
    if (!name) { flash(req, 'error', 'Укажите имя.'); return res.redirect('/admin/users'); }
    if (role === 'student' && !group) { flash(req, 'error', 'Для студента укажите группу.'); return res.redirect('/admin/users'); }
    if (db.getUserById(id)) { flash(req, 'error', `Пользователь «${id}» уже существует.`); return res.redirect(back); }
    try {
      db.createUser({ id, role, name, group, password: DEFAULT_PASSWORD, mustChangePassword: true });
      const who = role === 'teacher' ? 'Преподаватель' : `Студент (${group})`;
      flash(req, 'success', `${who} ${id} добавлен. Пароль: ${DEFAULT_PASSWORD} (сменит при входе).`);
    } catch (err) {
      flash(req, 'error', `Не удалось добавить: ${err.message}`);
    }
    return res.redirect(back);
  });

  // Массовое добавление студентов в одну группу (построчно: «ID; Имя»).
  router.post('/admin/users/bulk', (req, res) => {
    const group = String((req.body && req.body.group) || '').trim();
    const text = String((req.body && req.body.list) || '');
    const back = `/admin/users${group ? `?group=${encodeURIComponent(group)}` : ''}`;
    if (!group) { flash(req, 'error', 'Укажите группу для массового добавления.'); return res.redirect('/admin/users'); }
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { flash(req, 'error', 'Список пуст — вставьте студентов построчно.'); return res.redirect(back); }
    let added = 0;
    const skipped = [];
    lines.forEach((line) => {
      const { id, name } = parseLine(line);
      const fullName = name || id;
      if (!ID_RE.test(id)) { skipped.push(`${line} — плохой ID`); return; }
      if (db.getUserById(id)) { skipped.push(`${id} — уже есть`); return; }
      try {
        db.createUser({ id, role: 'student', name: fullName, group, password: DEFAULT_PASSWORD, mustChangePassword: true });
        added += 1;
      } catch (err) { skipped.push(`${id} — ${err.message}`); }
    });
    const tail = skipped.length ? ` Пропущено ${skipped.length}: ${skipped.slice(0, 8).join('; ')}${skipped.length > 8 ? '…' : ''}` : '';
    flash(req, added ? 'success' : 'error', `Добавлено ${added} в группу ${group} (пароль ${DEFAULT_PASSWORD}).${tail}`);
    return res.redirect(back);
  });

  // Сбросить пароль студента или преподавателя на общий временный (сменит при входе).
  router.post('/admin/users/:id/reset-password', (req, res) => {
    const user = db.getUserById(req.params.id);
    const back = `/admin/users${req.body && req.body.group ? `?group=${encodeURIComponent(req.body.group)}` : ''}`;
    if (!user || (user.role !== 'student' && user.role !== 'teacher')) return notFound(res, 'Пользователь не найден.');
    const ok = db.adminResetPassword(user.id, DEFAULT_PASSWORD);
    if (ok) flash(req, 'success', `Пароль ${user.id} сброшен на «${DEFAULT_PASSWORD}». Сменит его при следующем входе.`);
    else flash(req, 'error', 'Не удалось сбросить пароль.');
    return res.redirect(back);
  });
}

module.exports = { register };

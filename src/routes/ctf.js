const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const { getCaesarSecretForStudent } = require('../db');

const router = express.Router();

const CTF_CAESAR_DIR =
  process.env.CTF_CAESAR_DIR || path.join(__dirname, '..', '..', 'data', 'ctf', 'caesar');

const HELP_TEXT = `Доступные команды:
  ls [-a] [путь]   - показать содержимое каталога (-a - включая скрытые файлы)
  cd [путь]        - перейти в каталог (cd, cd ~ или cd без аргумента - домой; cd .. - на уровень выше)
  pwd              - показать текущий каталог
  cat <файл>       - показать содержимое файла
  find [путь]      - показать все файлы рекурсивно, включая скрытые
  whoami           - показать текущего пользователя
  id               - показать uid/gid текущего пользователя
  date             - показать текущую дату и время
  echo <текст>     - вывести текст
  clear            - очистить экран
  help             - эта справка

Когда найдёте и расшифруете пароль - выйдите (кнопка "Выйти" вверху)
и войдите заново под своим логином, используя этот пароль.`;

function sandboxRoot(studentId) {
  return path.join(CTF_CAESAR_DIR, studentId);
}

// Отображаемый путь для приглашения/pwd: '' (корень) -> "~", иначе "~/rel".
function promptPath(cwdRel) {
  return cwdRel ? `~/${cwdRel}` : '~';
}

// Резолвит ввод студента относительно текущего каталога (cwdAbs), с поддержкой
// "~" / "~/..." как корня песочницы. Возвращает null при попытке выйти
// за пределы домашнего каталога студента.
function resolveInSandbox(root, cwdAbs, input) {
  let rel = (input || '.').trim();
  if (rel === '~') rel = '.';
  else if (rel.startsWith('~/')) rel = rel.slice(2);
  const base = rel.startsWith('/') ? root : cwdAbs;
  const target = path.resolve(base, rel);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

function listRecursive(root, dir, showAll, out, prefix) {
  const entries = fs.readdirSync(dir).filter((e) => showAll || !e.startsWith('.'));
  for (const entry of entries.sort()) {
    const full = path.join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    out.push(rel + (fs.statSync(full).isDirectory() ? '/' : ''));
    if (fs.statSync(full).isDirectory()) listRecursive(root, full, showAll, out, rel);
  }
}

// cwdRel — текущий каталог студента относительно его домашней песочницы ('' = корень).
// Возвращает { output, cwdRel } — новый cwdRel сохраняется в сессию вызывающим кодом.
function runCommand(studentId, cwdRel, line) {
  const root = sandboxRoot(studentId);
  const cwdAbs = path.join(root, cwdRel || '');
  const parts = line.trim().split(/\s+/).filter(Boolean);
  const cmd = parts[0] || '';
  const rest = parts.slice(1);
  const rawArgs = line.trim().slice(cmd.length).trim();

  switch (cmd) {
    case '':
      return { output: '', cwdRel };
    case 'help':
      return { output: HELP_TEXT, cwdRel };
    case 'whoami':
      return { output: studentId, cwdRel };
    case 'id':
      return { output: `uid=1000(${studentId}) gid=1000(${studentId}) группы=1000(${studentId})`, cwdRel };
    case 'date':
      return { output: new Date().toString(), cwdRel };
    case 'echo':
      return { output: rawArgs, cwdRel };
    case 'pwd':
      return { output: `/home/${studentId}/${cwdRel}`.replace(/\/$/, ''), cwdRel };
    case 'clear':
      return { output: '__CLEAR__', cwdRel };
    case 'cd': {
      const argPath = rest[0];
      if (!argPath || argPath === '~') return { output: '', cwdRel: '' };
      const target = resolveInSandbox(root, cwdAbs, argPath);
      if (!target) return { output: 'cd: доступ за пределы домашнего каталога запрещён', cwdRel };
      if (!fs.existsSync(target)) return { output: `cd: ${argPath}: нет такого файла или каталога`, cwdRel };
      if (!fs.statSync(target).isDirectory()) return { output: `cd: ${argPath}: это не каталог`, cwdRel };
      const newRel = path.relative(root, target);
      return { output: '', cwdRel: newRel === '.' ? '' : newRel };
    }
    case 'ls': {
      const showAll = rest.includes('-a');
      const pathArg = rest.find((a) => a !== '-a');
      const target = resolveInSandbox(root, cwdAbs, pathArg);
      if (!target) return { output: 'ls: доступ за пределы домашнего каталога запрещён', cwdRel };
      if (!fs.existsSync(target)) return { output: `ls: ${pathArg || '.'}: нет такого файла или каталога`, cwdRel };
      const stat = fs.statSync(target);
      if (!stat.isDirectory()) return { output: path.basename(target), cwdRel };
      const entries = fs.readdirSync(target).filter((e) => showAll || !e.startsWith('.'));
      if (!entries.length) return { output: showAll ? '. ..' : '(пусто)', cwdRel };
      const formatted = entries
        .sort()
        .map((e) => (fs.statSync(path.join(target, e)).isDirectory() ? `${e}/` : e));
      return { output: formatted.join('  '), cwdRel };
    }
    case 'find': {
      const pathArg = rest[0];
      const target = resolveInSandbox(root, cwdAbs, pathArg);
      if (!target) return { output: 'find: доступ за пределы домашнего каталога запрещён', cwdRel };
      if (!fs.existsSync(target)) return { output: `find: ${pathArg || '.'}: нет такого файла или каталога`, cwdRel };
      const out = [];
      if (fs.statSync(target).isDirectory()) {
        out.push('.');
        listRecursive(root, target, true, out, '');
      } else {
        out.push(path.basename(target));
      }
      return { output: out.join('\n'), cwdRel };
    }
    case 'cat': {
      if (!rest[0]) return { output: 'cat: укажите файл', cwdRel };
      const target = resolveInSandbox(root, cwdAbs, rest[0]);
      if (!target) return { output: 'cat: доступ за пределы домашнего каталога запрещён', cwdRel };
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        return { output: `cat: ${rest[0]}: нет такого файла`, cwdRel };
      }
      return { output: fs.readFileSync(target, 'utf-8'), cwdRel };
    }
    default:
      return { output: `${cmd}: команда не найдена. Наберите "help".`, cwdRel };
  }
}

router.get('/ctf/caesar', requireRole('student'), (req, res) => {
  const secret = getCaesarSecretForStudent(req.session.user.id);
  res.render('ctf-caesar', {
    user: req.session.user,
    history: req.session.ctfHistory || [],
    cwdPrompt: promptPath(req.session.ctfCwd || ''),
    solved: secret ? !!secret.solved : false,
  });
});

router.post('/ctf/caesar/run', requireRole('student'), (req, res) => {
  const line = (req.body.cmd || '').slice(0, 200);
  const cwdRel = req.session.ctfCwd || '';
  const promptBefore = promptPath(cwdRel);

  if (!req.session.ctfHistory) req.session.ctfHistory = [];

  if (line.trim()) {
    const { output, cwdRel: nextCwd } = runCommand(req.session.user.id, cwdRel, line);
    req.session.ctfCwd = nextCwd;

    if (output === '__CLEAR__') {
      req.session.ctfHistory = [];
    } else {
      req.session.ctfHistory.push({ prompt: promptBefore, cmd: line, output });
      if (req.session.ctfHistory.length > 80) req.session.ctfHistory.shift();
    }
  }
  res.redirect('/ctf/caesar');
});

router.post('/ctf/caesar/clear', requireRole('student'), (req, res) => {
  req.session.ctfHistory = [];
  res.redirect('/ctf/caesar');
});

module.exports = router;

// Серверная перепроверка миссии предмета «Linux Terminal Trainer»: тот же движок, что в браузере
// (public/js/linux-fs.js), повторяет журнал команд студента на исходной ФС миссии и проверяет итог по
// правилам миссии (check). Клиентский вердикт — только подсказка; засчитывает сервер.
const path = require('path');
const LinuxFS = require(path.join(__dirname, '..', '..', '..', 'public', 'js', 'linux-fs.js'));

const MAX_LOG = 400;
const MAX_LINE = 400;

function replay(mission, log) {
  const state = LinuxFS.createState(mission.fs, mission.startCwd ? { cwd: cwdParts(mission.startCwd) } : {});
  const lines = (Array.isArray(log) ? log : []).slice(0, MAX_LOG).map((l) => String(l || '').slice(0, MAX_LINE));
  for (const line of lines) {
    try { LinuxFS.run(state, line); } catch (e) { /* строка журнала не должна ронять проверку */ }
  }
  return { state, lines };
}

function cwdParts(p) {
  const parts = LinuxFS.resolvePath(LinuxFS.createState({}), p);
  return parts;
}

function nodeAt(state, p) {
  return LinuxFS.getNode(state, LinuxFS.resolvePath(state, p));
}

// Проверяет одно правило. -> {ok, label}.
function checkRule(rule, state, lines) {
  if (rule.ran) {
    const [name, arg] = Array.isArray(rule.ran) ? rule.ran : [rule.ran, null];
    const ok = lines.some((l) => {
      const toks = l.trim().split(/\s+/);
      return toks[0] === name && (arg == null || l.includes(arg));
    });
    return { ok, label: `команда ${name}${arg ? ' ' + arg : ''}` };
  }
  if (rule.dir) { const n = nodeAt(state, rule.dir); return { ok: !!n && n.type === 'dir', label: `каталог ${rule.dir}` }; }
  if (rule.file) { const n = nodeAt(state, rule.file); return { ok: !!n && n.type === 'file', label: `файл ${rule.file}` }; }
  if (rule.absent) { return { ok: !nodeAt(state, rule.absent), label: `удалён ${rule.absent}` }; }
  if (rule.content) {
    const n = nodeAt(state, rule.content);
    const got = n && n.type === 'file' ? n.content.replace(/\s+$/, '') : null;
    return { ok: got === String(rule.equals).replace(/\s+$/, ''), label: `содержимое ${rule.content}` };
  }
  if (rule.includes) {
    const n = nodeAt(state, rule.includes);
    const got = n && n.type === 'file' ? n.content : '';
    return { ok: got.indexOf(rule.text) !== -1, label: `${rule.includes} содержит «${rule.text}»` };
  }
  if (rule.cwd) {
    return { ok: LinuxFS.cwdDisplay(state) === LinuxFS.cwdDisplay({ ...state, cwd: cwdParts(rule.cwd) }), label: `текущий каталог ${rule.cwd}` };
  }
  return { ok: false, label: 'неизвестное правило' };
}

// -> {solved, results:[{ok,label}], passed, total}.
function checkMission(mission, log) {
  const { state, lines } = replay(mission, log);
  const results = (mission.check || []).map((r) => checkRule(r, state, lines));
  const passed = results.filter((r) => r.ok).length;
  return { solved: results.length > 0 && passed === results.length, results, passed, total: results.length };
}

module.exports = { checkMission, replay };

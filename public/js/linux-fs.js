// Виртуальная файловая система и интерпретатор команд предмета «Linux Terminal Trainer»
// (план docs/todo/2026-10-31-linux-terminal-trainer-plan.md). UMD: работает и в браузере (UI с живым
// деревом и визуальным режимом), и в Node (серверная перепроверка миссий повтором журнала команд и тесты).
// Семантика команд — по мотивам ib/server/vfs.py: ошибки как в coreutils, несколько верных решений.
// Поддержаны: pwd whoami clear ls tree cd mkdir rmdir rm cat echo cp mv. Настоящая ОС недоступна.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LinuxFS = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- модель узлов: dir {type:'dir',children:{name:node}}, file {type:'file',content:string} ----
  function dir() { return { type: 'dir', children: {} }; }
  function file(content) { return { type: 'file', content: String(content == null ? '' : content) }; }

  // spec: вложенный объект; строка -> файл, объект -> каталог.
  function fromSpec(spec) {
    const d = dir();
    for (const name of Object.keys(spec || {})) {
      const v = spec[name];
      d.children[name] = (v && typeof v === 'object') ? fromSpec(v) : file(v);
    }
    return d;
  }

  const HOME = ['home', 'student'];

  function createState(spec, opts) {
    opts = opts || {};
    return {
      user: opts.user || 'student',
      host: opts.host || 'linux',
      root: fromSpec(spec || { home: { student: {} } }),
      cwd: (opts.cwd && opts.cwd.slice()) || HOME.slice(),
      prev: HOME.slice(),
    };
  }

  function clone(state) {
    return {
      user: state.user, host: state.host,
      root: JSON.parse(JSON.stringify(state.root)),
      cwd: state.cwd.slice(), prev: state.prev.slice(),
    };
  }

  // ---- пути ----
  // Разрешает аргумент-путь в абсолютный массив сегментов от корня (с учётом ~, /, .., ., относительного).
  function resolvePath(state, arg) {
    if (arg === '~' || arg === undefined || arg === '') arg = arg === '' ? '.' : (arg || '.');
    let base;
    let rest;
    if (arg === '~') { return HOME.slice(); }
    if (arg.indexOf('~/') === 0) { base = HOME.slice(); rest = arg.slice(2); }
    else if (arg[0] === '/') { base = []; rest = arg.slice(1); }
    else { base = state.cwd.slice(); rest = arg; }
    const parts = base;
    for (const piece of rest.split('/')) {
      if (piece === '' || piece === '.') continue;
      if (piece === '..') { if (parts.length) parts.pop(); continue; }
      parts.push(piece);
    }
    return parts;
  }

  function getNode(state, parts) {
    let node = state.root;
    for (const seg of parts) {
      if (node.type !== 'dir' || !node.children[seg]) return null;
      node = node.children[seg];
    }
    return node;
  }

  function parentOf(state, parts) {
    return { parent: getNode(state, parts.slice(0, -1)), name: parts[parts.length - 1], parts };
  }

  function display(parts) { return '/' + parts.join('/'); }

  function promptPath(state) {
    const p = state.cwd;
    if (p.length >= HOME.length && HOME.every((s, i) => p[i] === s)) {
      const rest = p.slice(HOME.length).join('/');
      return rest ? '~/' + rest : '~';
    }
    return p.length ? '/' + p.join('/') : '/';
  }

  function prompt(state) { return `${state.user}@${state.host}:${promptPath(state)}$ `; }

  // ---- разбор строки: команда + аргументы (кавычки) + перенаправление > / >> ----
  function parseLine(line) {
    let redirect = null; let target = null; let cmdPart = line;
    const m = line.match(/(>>|>)(?!.*(>>|>))\s*(.*)$/); // последнее перенаправление
    if (m) { redirect = m[1]; target = stripQuotes(m[3].trim()); cmdPart = line.slice(0, m.index); }
    const args = tokenize(cmdPart);
    return { args, redirect, target };
  }

  function tokenize(s) {
    const out = []; let cur = ''; let q = null; let has = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q) q = null; else cur += c; }
      else if (c === '"' || c === "'") { q = c; has = true; }
      else if (c === ' ' || c === '\t') { if (has || cur) { out.push(cur); cur = ''; has = false; } }
      else { cur += c; has = true; }
    }
    if (has || cur) out.push(cur);
    return out;
  }

  function stripQuotes(s) { return s.replace(/^['"]|['"]$/g, ''); }

  function splitFlags(args) {
    const flags = {}; const operands = [];
    for (const a of args) {
      if (a.length > 1 && a[0] === '-' && a !== '--') for (const ch of a.slice(1)) flags[ch] = true;
      else operands.push(a);
    }
    return { flags, operands };
  }

  // ---- команды: (state, args, redirect, target) -> {out, err, cleared} ----
  const E = (msg) => ({ out: '', err: msg, cleared: false });
  const O = (out) => ({ out: out == null ? '' : out, err: null, cleared: false });

  // Сортировка без учёта регистра — как у настоящего ls/tree в типичной локали.
  function sortedNames(node, all) {
    return Object.keys(node.children).filter((n) => all || n[0] !== '.')
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) || a.localeCompare(b));
  }

  const COMMANDS = {
    pwd(state) { return O(display(state.cwd)); },
    whoami(state) { return O(state.user); },
    clear() { return { out: '', err: null, cleared: true }; },

    ls(state, args) {
      const { flags, operands } = splitFlags(args.slice(1));
      const targets = operands.length ? operands : ['.'];
      const long = flags.l; const all = flags.a;
      const blocks = [];
      let err = '';
      for (const t of targets) {
        const parts = resolvePath(state, t);
        const node = getNode(state, parts);
        if (!node) { err += `ls: невозможно получить доступ к '${t}': Нет такого файла или каталога\n`; continue; }
        let names;
        if (node.type === 'file') names = [{ name: t, node }];
        else names = sortedNames(node, all).map((n) => ({ name: n, node: node.children[n] }));
        const header = targets.length > 1 ? `${t}:\n` : '';
        if (long) {
          const lines = names.map(({ name, node: n }) => {
            const perm = n.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
            const size = n.type === 'dir' ? 4096 : n.content.length;
            return `${perm} ${state.user} ${state.user} ${String(size).padStart(5)} ${name}${n.type === 'dir' ? '/' : ''}`;
          });
          blocks.push(header + lines.join('\n'));
        } else {
          blocks.push(header + names.map(({ name, node: n }) => name + (n.type === 'dir' ? '/' : '')).join('  '));
        }
      }
      const res = O(blocks.filter((b) => b !== '').join('\n\n'));
      if (err) res.err = err.trimEnd();
      return res;
    },

    tree(state, args) {
      let maxDepth = Infinity; const operands = [];
      const rest = args.slice(1);
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i];
        if (a === '-L') { maxDepth = parseInt(rest[++i], 10) || Infinity; }
        else if (a.indexOf('-L') === 0) { maxDepth = parseInt(a.slice(2), 10) || Infinity; }
        else if (a[0] !== '-') operands.push(a);
      }
      const t = operands[0] || '.';
      const parts = resolvePath(state, t);
      const node = getNode(state, parts);
      if (!node) return E(`${t}  [error opening dir]`);
      if (node.type === 'file') return O(t);
      const lines = [t === '.' ? display(state.cwd) : t];
      let dirs = 0; let files = 0;
      (function walk(n, prefix, depth) {
        if (depth > maxDepth) return;
        const names = sortedNames(n, false);
        names.forEach((name, i) => {
          const child = n.children[name];
          const last = i === names.length - 1;
          lines.push(prefix + (last ? '└── ' : '├── ') + name);
          if (child.type === 'dir') { dirs++; walk(child, prefix + (last ? '    ' : '│   '), depth + 1); }
          else files++;
        });
      })(node, '', 1);
      lines.push('');
      lines.push(`${dirs} directories, ${files} files`);
      return O(lines.join('\n'));
    },

    cd(state, args) {
      const { operands } = splitFlags(args.slice(1));
      let t = operands[0];
      if (t === undefined || t === '~') t = '~';
      if (t === '-') {
        const to = state.prev.slice();
        state.prev = state.cwd.slice(); state.cwd = to;
        return O(display(state.cwd));
      }
      const parts = resolvePath(state, t);
      const node = getNode(state, parts);
      if (!node) return E(`cd: ${t}: Нет такого файла или каталога`);
      if (node.type !== 'dir') return E(`cd: ${t}: Это не каталог`);
      state.prev = state.cwd.slice(); state.cwd = parts;
      return { out: '', err: null, cleared: false };
    },

    mkdir(state, args) {
      const { flags, operands } = splitFlags(args.slice(1));
      if (!operands.length) return E('mkdir: пропущен операнд');
      let err = '';
      for (const t of operands) {
        const parts = resolvePath(state, t);
        if (flags.p) {
          let node = state.root;
          for (const seg of parts) {
            if (!node.children[seg]) node.children[seg] = dir();
            if (node.children[seg].type !== 'dir') { err += `mkdir: невозможно создать каталог '${t}': Файл существует\n`; break; }
            node = node.children[seg];
          }
        } else {
          const { parent, name } = parentOf(state, parts);
          if (!parent || parent.type !== 'dir') { err += `mkdir: невозможно создать каталог '${t}': Нет такого файла или каталога\n`; continue; }
          if (parent.children[name]) { err += `mkdir: невозможно создать каталог '${t}': Файл существует\n`; continue; }
          parent.children[name] = dir();
        }
      }
      return err ? E(err.trimEnd()) : { out: '', err: null, cleared: false };
    },

    rmdir(state, args) {
      const { operands } = splitFlags(args.slice(1));
      if (!operands.length) return E('rmdir: пропущен операнд');
      let err = '';
      for (const t of operands) {
        const parts = resolvePath(state, t);
        const { parent, name } = parentOf(state, parts);
        const node = parent && parent.children[name];
        if (!node) { err += `rmdir: не удалось удалить '${t}': Нет такого файла или каталога\n`; continue; }
        if (node.type !== 'dir') { err += `rmdir: не удалось удалить '${t}': Это не каталог\n`; continue; }
        if (Object.keys(node.children).length) { err += `rmdir: не удалось удалить '${t}': Каталог не пуст\n`; continue; }
        delete parent.children[name];
      }
      return err ? E(err.trimEnd()) : { out: '', err: null, cleared: false };
    },

    rm(state, args) {
      const { flags, operands } = splitFlags(args.slice(1));
      if (!operands.length) return flags.f ? { out: '', err: null, cleared: false } : E('rm: пропущен операнд');
      let err = '';
      for (const t of operands) {
        const parts = resolvePath(state, t);
        const { parent, name } = parentOf(state, parts);
        const node = parent && parent.children[name];
        if (!node) { if (!flags.f) err += `rm: невозможно удалить '${t}': Нет такого файла или каталога\n`; continue; }
        if (node.type === 'dir' && !flags.r) { err += `rm: невозможно удалить '${t}': Это каталог\n`; continue; }
        delete parent.children[name];
      }
      return err ? E(err.trimEnd()) : { out: '', err: null, cleared: false };
    },

    cat(state, args) {
      const { operands } = splitFlags(args.slice(1));
      if (!operands.length) return E('cat: укажите файл');
      const outs = []; let err = '';
      for (const t of operands) {
        const node = getNode(state, resolvePath(state, t));
        if (!node) { err += `cat: ${t}: Нет такого файла или каталога\n`; continue; }
        if (node.type === 'dir') { err += `cat: ${t}: Это каталог\n`; continue; }
        outs.push(node.content.replace(/\n$/, ''));
      }
      const res = O(outs.join('\n'));
      if (err) res.err = err.trimEnd();
      return res;
    },

    echo(state, args, redirect, target) {
      const text = args.slice(1).join(' ');
      if (redirect && target) {
        const parts = resolvePath(state, target);
        const { parent, name } = parentOf(state, parts);
        if (!parent || parent.type !== 'dir') return E(`bash: ${target}: Нет такого файла или каталога`);
        const existing = parent.children[name];
        if (existing && existing.type === 'dir') return E(`bash: ${target}: Это каталог`);
        const line = text + '\n';
        if (redirect === '>>' && existing && existing.type === 'file') existing.content += line;
        else parent.children[name] = file(line);
        return { out: '', err: null, cleared: false };
      }
      return O(text);
    },

    cp(state, args) {
      const { flags, operands } = splitFlags(args.slice(1));
      if (operands.length < 2) return E('cp: пропущен операнд');
      const dst = operands.pop();
      let err = '';
      for (const src of operands) {
        const sNode = getNode(state, resolvePath(state, src));
        if (!sNode) { err += `cp: невозможно выполнить stat для '${src}': Нет такого файла или каталога\n`; continue; }
        if (sNode.type === 'dir' && !flags.r) { err += `cp: -r не указан; каталог '${src}' пропущен\n`; continue; }
        const r = placeInto(state, dst, baseName(src), sNode, operands.length > 1);
        if (r) err += r + '\n';
      }
      return err ? E(err.trimEnd()) : { out: '', err: null, cleared: false };
    },

    mv(state, args) {
      const { operands } = splitFlags(args.slice(1));
      if (operands.length < 2) return E('mv: пропущен операнд');
      const dst = operands.pop();
      let err = '';
      for (const src of operands) {
        const parts = resolvePath(state, src);
        const { parent, name } = parentOf(state, parts);
        const sNode = parent && parent.children[name];
        if (!sNode) { err += `mv: невозможно выполнить stat для '${src}': Нет такого файла или каталога\n`; continue; }
        const r = placeInto(state, dst, name, sNode, operands.length > 1);
        if (r) { err += r + '\n'; continue; }
        delete parent.children[name];
      }
      return err ? E(err.trimEnd()) : { out: '', err: null, cleared: false };
    },
  };

  function baseName(p) { const s = p.replace(/\/+$/, '').split('/'); return s[s.length - 1]; }

  // Кладёт копию node в dst: если dst — существующий каталог, внутрь под именем name; иначе dst — новое имя.
  function placeInto(state, dst, name, node, mustBeDir) {
    const dParts = resolvePath(state, dst);
    const dNode = getNode(state, dParts);
    let parent; let finalName;
    if (dNode && dNode.type === 'dir') { parent = dNode; finalName = name; }
    else if (dNode && dNode.type === 'file') { if (node.type === 'dir') return `нельзя перезаписать '${dst}' каталогом`; parent = getNode(state, dParts.slice(0, -1)); finalName = dParts[dParts.length - 1]; }
    else {
      if (mustBeDir) return `цель '${dst}' не является каталогом`;
      parent = getNode(state, dParts.slice(0, -1)); finalName = dParts[dParts.length - 1];
      if (!parent || parent.type !== 'dir') return `'${dst}': Нет такого файла или каталога`;
    }
    parent.children[finalName] = JSON.parse(JSON.stringify(node));
    return null;
  }

  // ---- главный интерфейс ----
  function run(state, line) {
    const raw = String(line || '').trim();
    if (!raw) return { out: '', err: null, cleared: false, prompt: prompt(state) };
    const { args, redirect, target } = parseLine(raw);
    const name = args[0];
    const fn = COMMANDS[name];
    let res;
    if (!fn) res = E(`${name}: команда не найдена`);
    else {
      try { res = fn(state, args, redirect, target); }
      catch (e) { res = E(`${name}: ошибка выполнения`); }
    }
    res.prompt = prompt(state);
    return res;
  }

  // Снимок дерева для панели файлов UI: {name,type,children:[...]} отсортированный.
  function snapshot(state, path) {
    const parts = path ? resolvePath(state, path) : [];
    const node = getNode(state, parts);
    const rootName = parts.length ? parts[parts.length - 1] : (state.root.children.home ? '/' : '/');
    function walk(n, nm) {
      if (n.type === 'file') return { name: nm, type: 'file', size: n.content.length };
      return { name: nm, type: 'dir', children: sortedNames(n, true).map((c) => walk(n.children[c], c)) };
    }
    return node ? walk(node, rootName) : null;
  }

  return {
    fromSpec, createState, clone, run, prompt,
    resolvePath, getNode, snapshot,
    cwdDisplay: (state) => display(state.cwd),
    cwdParts: (state) => state.cwd.slice(),
    HOME: HOME.slice(),
  };
}));

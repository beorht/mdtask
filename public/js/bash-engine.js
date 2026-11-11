// Интерпретатор подмножества bash для предмета «Bash: скрипты в Linux»
// (план docs/todo/2026-11-10-bash-subject-plan.md). UMD: работает в браузере (запуск скрипта студента
// с аргументами и вводом) и в Node (серверная перепроверка тем же движком + тесты). Сервер код студента
// не исполняет — он прогоняется этим интерпретатором. Поддерживается ровно то подмножество, что нужно
// темам курса: переменные и подстановка параметров, аргументы, $?, $( ), $(( )), test/[ ]/[[ ]], if/elif/else,
// case, while/until/for, read, echo/printf и небольшой набор команд (seq, cat, wc, ls, grep -q, basename …).
// Настоящая ОС, сеть и произвольные внешние программы недоступны.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BashEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_STEPS = 200000;   // защита от бесконечных циклов
  var MAX_OUTPUT = 100000;  // защита от бесконечного вывода

  // ======================= Ошибки управления потоком =======================
  function BreakSig(n) { this.n = n; }
  function ContinueSig(n) { this.n = n; }
  function ExitSig(code) { this.code = code; }
  function ReturnSig(code) { this.code = code; }
  function ShellError(msg) { this.message = msg; } // синтаксическая/рантайм ошибка bash

  // ======================= Виртуальная ФС =======================
  function dir() { return { type: 'dir', children: {} }; }
  function file(content, mode) { return { type: 'file', content: String(content == null ? '' : content), mode: mode || 0 }; }
  function fromSpec(spec) {
    var d = dir();
    for (var name in (spec || {})) {
      if (!Object.prototype.hasOwnProperty.call(spec, name)) continue;
      var v = spec[name];
      d.children[name] = (v && typeof v === 'object' && !Array.isArray(v)) ? fromSpec(v) : file(v);
    }
    return d;
  }

  // ======================= Состояние оболочки =======================
  function createShell(opts) {
    opts = opts || {};
    var env = {};
    var baseEnv = {
      USER: 'student', HOME: '/home/student', HOSTNAME: 'linux', PWD: '/home/student',
      SHELL: '/bin/bash', LANG: 'ru_RU.UTF-8', PATH: '/usr/local/bin:/usr/bin:/bin'
    };
    for (var k in baseEnv) env[k] = baseEnv[k];
    if (opts.env) for (var e in opts.env) env[e] = String(opts.env[e]);
    var sh = {
      vars: {},                 // обычные переменные (имя -> {value, exported, readonly})
      env: env,                 // значения окружения/экспортируемых
      positional: (opts.args || []).map(String),
      name: opts.name || 'script.sh',
      status: 0,
      cwd: opts.cwd || env.HOME,
      root: fromSpec(opts.fs || { home: { student: {} } }),
      installed: opts.installed || ['bash', 'echo', 'ls', 'cat', 'grep', 'wc', 'seq', 'date', 'git'],
      stdin: splitLines(opts.stdin || ''),  // очередь строк ввода для read
      stdinPos: 0,
      out: [], err: [],         // буферы вывода
      outLen: 0, errLen: 0,
      steps: 0,
      now: opts.now ? new Date(opts.now) : new Date('2026-01-15T10:30:00'),
      funcs: {}
    };
    // IFS по умолчанию
    sh.vars.IFS = { value: ' \t\n', exported: false, readonly: false };
    // гарантируем существование домашнего каталога
    ensureDir(sh.root, (env.HOME || '/home/student').split('/').filter(Boolean));
    // opts.files — файлы, смонтированные в рабочий каталог (cwd), для относительных путей задания
    if (opts.files) {
      var cwdParts = sh.cwd.split('/').filter(Boolean);
      var cwdDir = ensureDir(sh.root, cwdParts);
      var mounted = fromSpec(opts.files);
      for (var fn in mounted.children) cwdDir.children[fn] = mounted.children[fn];
    }
    return sh;
  }
  function ensureDir(root, parts) {
    var n = root;
    for (var i = 0; i < parts.length; i++) {
      if (!n.children[parts[i]] || n.children[parts[i]].type !== 'dir') n.children[parts[i]] = dir();
      n = n.children[parts[i]];
    }
    return n;
  }
  function splitLines(s) {
    s = String(s == null ? '' : s);
    if (s === '') return [];
    var lines = s.split('\n');
    if (lines[lines.length - 1] === '') lines.pop(); // хвостовой \n не даёт лишней пустой строки
    return lines;
  }

  function write(sh, stream, text) {
    text = String(text);
    if (stream === 'err') { sh.err.push(text); sh.errLen += text.length; if (sh.errLen > MAX_OUTPUT) throw new ShellError('слишком много вывода'); }
    else { sh.out.push(text); sh.outLen += text.length; if (sh.outLen > MAX_OUTPUT) throw new ShellError('слишком много вывода'); }
  }
  function step(sh) { if (++sh.steps > MAX_STEPS) throw new ShellError('скрипт выполняется слишком долго (возможно, бесконечный цикл)'); }

  // ---- переменные ----
  function getVar(sh, name) {
    if (Object.prototype.hasOwnProperty.call(sh.vars, name)) return sh.vars[name].value;
    if (Object.prototype.hasOwnProperty.call(sh.env, name)) return sh.env[name];
    return undefined;
  }
  function isSet(sh, name) {
    return Object.prototype.hasOwnProperty.call(sh.vars, name) || Object.prototype.hasOwnProperty.call(sh.env, name);
  }
  function setVar(sh, name, value, opts) {
    opts = opts || {};
    var cur = sh.vars[name];
    if (cur && cur.readonly) throw new ShellError(name + ': readonly variable');
    if (Object.prototype.hasOwnProperty.call(sh.env, name)) { sh.env[name] = String(value); if (cur) cur.value = String(value); return; }
    if (!cur) sh.vars[name] = { value: String(value), exported: !!opts.exported, readonly: !!opts.readonly };
    else { cur.value = String(value); if (opts.exported) cur.exported = true; if (opts.readonly) cur.readonly = true; }
    if (sh.vars[name].exported) sh.env[name] = sh.vars[name].value;
  }
  function unsetVar(sh, name) {
    if (sh.vars[name] && sh.vars[name].readonly) throw new ShellError(name + ': cannot unset: readonly variable');
    delete sh.vars[name];
    delete sh.env[name];
  }
  function getIFS(sh) { var v = getVar(sh, 'IFS'); return v === undefined ? ' \t\n' : v; }

  // ======================= ФС: разбор путей =======================
  function resolve(sh, p) {
    if (p === undefined || p === '') p = '.';
    if (p === '~') p = sh.env.HOME;
    else if (p.slice(0, 2) === '~/') p = sh.env.HOME + p.slice(1);
    var base;
    if (p[0] === '/') base = [];
    else base = sh.cwd.split('/').filter(Boolean);
    var parts = base.slice();
    var segs = p.split('/');
    for (var i = 0; i < segs.length; i++) {
      var piece = segs[i];
      if (piece === '' || piece === '.') continue;
      if (piece === '..') { if (parts.length) parts.pop(); continue; }
      parts.push(piece);
    }
    return parts;
  }
  function nodeAt(sh, p) {
    var parts = Array.isArray(p) ? p : resolve(sh, p);
    var n = sh.root;
    for (var i = 0; i < parts.length; i++) {
      if (!n || n.type !== 'dir') return null;
      n = n.children[parts[i]];
      if (!n) return null;
    }
    return n || null;
  }
  function parentOf(sh, parts) {
    var n = sh.root;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!n || n.type !== 'dir') return null;
      n = n.children[parts[i]];
    }
    return (n && n.type === 'dir') ? n : null;
  }

  // ======================= Токенизатор =======================
  // Токены: {t:'word', parts:[...]} | {t:'op', v:';'|'&&'|…} | {t:'newline'}
  // part: {s:'lit'|'var'|'cmd'|'arith'|'arithword', v:raw, q:'none'|'double'} для раздельного раскрытия.
  var OPS3 = [';;&'];
  var OPS2 = [';;', ';&', '&&', '||', '>>', '2>', '&>', '<<'];
  function tokenize(src) {
    var toks = [];
    var i = 0, n = src.length;
    function peek(k) { return src[i + (k || 0)]; }
    function isBlank(c) { return c === ' ' || c === '\t'; }
    while (i < n) {
      var c = src[i];
      if (c === '\\' && src[i + 1] === '\n') { i += 2; continue; } // перенос строки
      if (c === '#' && (i === 0 || isBlank(src[i - 1]) || src[i - 1] === '\n' || src[i - 1] === ';' || src[i - 1] === '&' || src[i - 1] === '|' || src[i - 1] === '(')) {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '\n') { toks.push({ t: 'newline' }); i++; continue; }
      if (isBlank(c)) { i++; continue; }
      if (c === '<' && src[i + 1] === '<' && src[i + 2] === '<') { toks.push({ t: 'op', v: '<<<' }); i += 3; continue; }
      // перенаправления fd: 2>&1, >&2, 1>&2
      var mred = /^(\d?)(>>|>)&(\d)/.exec(src.slice(i));
      if (mred) { toks.push({ t: 'op', v: (mred[1] || '') + '>&' + mred[3] }); i += mred[0].length; continue; }
      var three = src.substr(i, 3);
      if (OPS3.indexOf(three) !== -1) { toks.push({ t: 'op', v: three }); i += 3; continue; }
      var two = src.substr(i, 2);
      if (OPS2.indexOf(two) !== -1) { toks.push({ t: 'op', v: two }); i += 2; continue; }
      if (c === '(' && src[i + 1] === '(') { // (( arith ))
        var ar = readBalanced(src, i + 2, '(', ')');
        toks.push({ t: 'word', arithCmd: true, parts: [{ s: 'arithword', v: ar.inner, q: 'none' }] });
        i = ar.end + 1; // после первой ) ; дальше ожидаем вторую )
        if (src[i] === ')') i++;
        continue;
      }
      if (c === ';' || c === '|' || c === '&' || c === '(' || c === ')' || c === '<' || c === '>') {
        toks.push({ t: 'op', v: c }); i++; continue;
      }
      // слово
      var w = readWord(src, i);
      toks.push({ t: 'word', parts: w.parts, raw: w.raw });
      i = w.end;
    }
    toks.push({ t: 'eof' });
    return toks;
  }

  function readBalanced(src, start, open, close) {
    var depth = 1, i = start, inner = '';
    while (i < src.length && depth > 0) {
      var c = src[i];
      if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) break; }
      inner += c; i++;
    }
    return { inner: inner, end: i };
  }

  // Читает одно слово с учётом кавычек и подстановок. Возвращает {parts, raw, end}.
  function readWord(src, start) {
    var i = start, n = src.length, parts = [], raw = '';
    var cur = ''; var curQ = 'none';
    function flush() { if (cur !== '') { parts.push({ s: 'lit', v: cur, q: curQ }); cur = ''; } }
    while (i < n) {
      var c = src[i];
      if (curQ === 'none' && (c === ' ' || c === '\t' || c === '\n' || c === ';' || c === '|' || c === '&' || c === '(' || c === ')' || c === '<' || c === '>')) break;
      raw += c;
      if (c === '\\') { // экранирование
        var nxt = src[i + 1];
        if (nxt === '\n') { i += 2; continue; }
        if (nxt === undefined) { cur += '\\'; i++; continue; }
        if (curQ === 'double') {
          // в двойных кавычках \ экранирует только $ ` " \ ; перед остальным остаётся как есть (\t → \t)
          if ('\\$`"'.indexOf(nxt) !== -1) { cur += nxt; } else { cur += '\\' + nxt; }
          i += 2; continue;
        }
        cur += nxt; i += 2; continue; // вне кавычек \ убирается
      }
      if (c === "'" && curQ !== 'double') { // одинарные кавычки — буквально
        flush();
        i++;
        var lit = '';
        while (i < n && src[i] !== "'") { lit += src[i]; raw += src[i]; i++; }
        if (src[i] === "'") { raw += "'"; i++; }
        parts.push({ s: 'lit', v: lit, q: 'single' });
        continue;
      }
      if (c === '"') { flush(); curQ = (curQ === 'double') ? 'none' : 'double'; i++; continue; }
      if (c === '$') {
        var nx = src[i + 1];
        if (nx === '(' && src[i + 2] === '(') { // $(( arith ))
          flush();
          var a = readBalanced(src, i + 3, '(', ')');
          parts.push({ s: 'arith', v: a.inner, q: curQ });
          raw += src.substring(i + 1, a.end + 2);
          i = a.end + 1; if (src[i] === ')') i++; if (src[i] === ')') i++;
          continue;
        }
        if (nx === '(') { // $( cmd )
          flush();
          var cs = readBalanced(src, i + 2, '(', ')');
          parts.push({ s: 'cmd', v: cs.inner, q: curQ });
          raw += src.substring(i + 1, cs.end + 1);
          i = cs.end + 1; if (src[i] === ')') i++;
          continue;
        }
        if (nx === '{') { // ${ ... }
          flush();
          var br = readBalanced(src, i + 2, '{', '}');
          parts.push({ s: 'var', v: br.inner, braced: true, q: curQ });
          raw += src.substring(i + 1, br.end + 1);
          i = br.end + 1; if (src[i] === '}') i++;
          continue;
        }
        // $name или спецсимвол $?, $#, $@, $*, $1…
        flush();
        var j = i + 1, varname = '';
        if (/[0-9]/.test(src[j])) { varname = src[j]; j++; }
        else if ('?#@*$!-'.indexOf(src[j]) !== -1) { varname = src[j]; j++; }
        else { while (j < n && /[A-Za-z0-9_]/.test(src[j])) { varname += src[j]; j++; } }
        if (varname === '') { cur += '$'; i++; continue; }
        parts.push({ s: 'var', v: varname, braced: false, q: curQ });
        raw += src.substring(i + 1, j);
        i = j;
        continue;
      }
      if (c === '`') { // обратные кавычки = $( )
        flush();
        i++;
        var bt = '';
        while (i < n && src[i] !== '`') { if (src[i] === '\\' && (src[i + 1] === '`' || src[i + 1] === '$')) { bt += src[i + 1]; raw += src[i] + src[i + 1]; i += 2; continue; } bt += src[i]; raw += src[i]; i++; }
        if (src[i] === '`') { raw += '`'; i++; }
        parts.push({ s: 'cmd', v: bt, q: curQ });
        continue;
      }
      cur += c; i++;
    }
    flush();
    return { parts: parts, raw: raw, end: i };
  }

  // ======================= Парсер =======================
  // Грамматика (упрощённо):
  //   program := list
  //   list := andor ( (';'|'&'|newline) andor )*
  //   andor := pipeline ( ('&&'|'||') pipeline )*
  //   pipeline := command ( '|' command )*
  //   command := compound | simple
  function Parser(toks) { this.toks = toks; this.i = 0; }
  Parser.prototype.peek = function () { return this.toks[this.i]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.atWord = function (w) { var t = this.peek(); return t.t === 'word' && !t.arithCmd && wordText(t) === w; };
  Parser.prototype.skipNL = function () { while (this.peek().t === 'newline' || (this.peek().t === 'op' && this.peek().v === ';')) this.next(); };
  Parser.prototype.skipSep = function () { while (this.peek().t === 'newline') this.next(); };

  function wordText(tok) { // буквальный текст слова (для распознавания ключевых слов)
    if (!tok.parts) return '';
    var s = '';
    for (var k = 0; k < tok.parts.length; k++) { var p = tok.parts[k]; if (p.s === 'lit') s += p.v; else return '\0' + Math.random(); }
    return s;
  }

  var RESERVED = ['if', 'then', 'elif', 'else', 'fi', 'for', 'while', 'until', 'do', 'done', 'case', 'esac', 'in', 'function', '{', '}'];

  Parser.prototype.parseProgram = function () {
    var list = this.parseList(['eof']);
    return list;
  };

  // список команд до одного из stopWords (ключевых слов)
  Parser.prototype.parseList = function (stops) {
    var items = [];
    this.skipSep();
    while (true) {
      var t = this.peek();
      if (t.t === 'eof') break;
      if (t.t === 'word' && !t.arithCmd && stops.indexOf(wordText(t)) !== -1) break;
      if (t.t === 'op' && (t.v === ')' || t.v === ';;' || t.v === ';&' || t.v === ';;&')) break;
      var andor = this.parseAndOr();
      var sep = ';';
      var pt = this.peek();
      if (pt.t === 'op' && (pt.v === ';' || pt.v === '&')) { sep = pt.v; this.next(); }
      else if (pt.t === 'newline') { this.next(); }
      items.push({ node: andor, sep: sep });
      this.skipSep();
      var after = this.peek();
      if (after.t === 'eof') break;
      if (after.t === 'word' && !after.arithCmd && stops.indexOf(wordText(after)) !== -1) break;
      if (after.t === 'op' && (after.v === ')' || after.v === ';;' || after.v === ';&' || after.v === ';;&')) break;
    }
    return { type: 'list', items: items };
  };

  Parser.prototype.parseAndOr = function () {
    var left = this.parsePipeline();
    while (true) {
      var t = this.peek();
      if (t.t === 'op' && (t.v === '&&' || t.v === '||')) {
        this.next(); this.skipSep();
        var right = this.parsePipeline();
        left = { type: 'andor', op: t.v, left: left, right: right };
      } else break;
    }
    return left;
  };

  Parser.prototype.parsePipeline = function () {
    var cmds = [this.parseCommand()];
    while (this.peek().t === 'op' && this.peek().v === '|') {
      this.next(); this.skipSep();
      cmds.push(this.parseCommand());
    }
    if (cmds.length === 1) return cmds[0];
    return { type: 'pipeline', cmds: cmds };
  };

  Parser.prototype.parseCommand = function () {
    var t = this.peek();
    var compound = null;
    if (t.t === 'word' && !t.arithCmd) {
      var w = wordText(t);
      if (w === 'if') compound = this.parseIf();
      else if (w === 'while' || w === 'until') compound = this.parseWhile(w);
      else if (w === 'for') compound = this.parseFor();
      else if (w === 'case') compound = this.parseCase();
      else if (w === '{') compound = this.parseBrace();
      else if (w === 'function') return this.parseFuncDef();
    }
    if (!compound && t.t === 'op' && t.v === '(') compound = this.parseSubshell();
    if (compound) {
      var redirs = this.parseTrailingRedirs();
      if (redirs.length) return { type: 'redir', node: compound, redirs: redirs };
      return compound;
    }
    return this.parseSimple();
  };

  var REDIR_NOTARGET = /^\d?>&\d$/;
  function isRedirOp(v) { return ['>', '>>', '<', '2>', '2>>', '&>', '<<<'].indexOf(v) !== -1 || REDIR_NOTARGET.test(v); }
  Parser.prototype.parseTrailingRedirs = function () {
    var redirs = [];
    while (this.peek().t === 'op' && isRedirOp(this.peek().v)) {
      var op = this.next().v;
      if (REDIR_NOTARGET.test(op)) redirs.push({ op: op, target: null });
      else redirs.push({ op: op, target: this.next() });
    }
    return redirs;
  };

  Parser.prototype.expect = function (word) {
    var t = this.peek();
    if (t.t === 'word' && wordText(t) === word) { this.next(); return; }
    throw new ShellError('ожидалось «' + word + '»' + (t.t === 'eof' ? ' (неожиданный конец файла)' : ''));
  };

  Parser.prototype.parseIf = function () {
    this.expect('if');
    var cond = this.parseList(['then']);
    this.expect('then');
    var body = this.parseList(['elif', 'else', 'fi']);
    var clauses = [{ cond: cond, body: body }];
    var elseBody = null;
    while (this.atWord('elif')) {
      this.next();
      var c2 = this.parseList(['then']);
      this.expect('then');
      var b2 = this.parseList(['elif', 'else', 'fi']);
      clauses.push({ cond: c2, body: b2 });
    }
    if (this.atWord('else')) { this.next(); elseBody = this.parseList(['fi']); }
    this.expect('fi');
    return { type: 'if', clauses: clauses, elseBody: elseBody };
  };

  Parser.prototype.parseWhile = function (kind) {
    this.expect(kind);
    var cond = this.parseList(['do']);
    this.expect('do');
    var body = this.parseList(['done']);
    this.expect('done');
    return { type: 'while', until: kind === 'until', cond: cond, body: body };
  };

  Parser.prototype.parseFor = function () {
    this.expect('for');
    var t = this.peek();
    if (t.t === 'word' && t.arithCmd) { // for (( init; cond; step ))
      this.next();
      var inner = t.parts[0].v;
      var segs = splitArithFor(inner);
      this.skipNL();
      this.expect('do');
      var body = this.parseList(['done']);
      this.expect('done');
      return { type: 'cfor', init: segs[0], cond: segs[1], step: segs[2], body: body };
    }
    var vn = this.next();
    var varName = wordText(vn);
    var words = [];
    var hasIn = false;
    if (this.atWord('in')) { hasIn = true; this.next(); while (this.peek().t === 'word' && !this.atWord('do') && !(this.peek().t === 'op')) { words.push(this.next()); } }
    // пропустить ; и newline
    while (this.peek().t === 'op' && this.peek().v === ';') this.next();
    this.skipNL();
    this.expect('do');
    var body2 = this.parseList(['done']);
    this.expect('done');
    return { type: 'for', varName: varName, words: words, hasIn: hasIn, body: body2 };
  };

  function splitArithFor(inner) {
    // делит "init; cond; step" на части по ; верхнего уровня
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < inner.length; i++) {
      var c = inner[i];
      if (c === '(') depth++; if (c === ')') depth--;
      if (c === ';' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    while (out.length < 3) out.push('');
    return out;
  }

  Parser.prototype.parseCase = function () {
    this.expect('case');
    var wordTok = this.next(); // слово-выражение
    this.expect('in');
    this.skipSep();
    var clauses = [];
    while (!this.atWord('esac')) {
      if (this.peek().t === 'eof') throw new ShellError('ожидалось «esac»');
      // необязательная открывающая (
      if (this.peek().t === 'op' && this.peek().v === '(') this.next();
      var patterns = [];
      patterns.push(this.next()); // первый шаблон-слово
      while (this.peek().t === 'op' && this.peek().v === '|') { this.next(); patterns.push(this.next()); }
      if (!(this.peek().t === 'op' && this.peek().v === ')')) throw new ShellError('в case ожидалась «)»');
      this.next(); // )
      var body = this.parseCaseBody();
      clauses.push({ patterns: patterns, body: body.list, term: body.term });
      this.skipSep();
    }
    this.expect('esac');
    return { type: 'case', word: wordTok, clauses: clauses };
  };

  Parser.prototype.parseCaseBody = function () {
    // тело ветки до ;; / ;& / ;;& / esac
    var list = this.parseList([]); // parseList остановится на op, но ;; это op? нет — ;; это отдельный op-токен
    // parseList останавливается на eof/reserved/) ; нам надо вручную ловить ;; и т.п.
    return { list: list, term: this.consumeCaseTerm() };
  };
  Parser.prototype.consumeCaseTerm = function () {
    var t = this.peek();
    if (t.t === 'op' && (t.v === ';;' || t.v === ';&' || t.v === ';;&')) { this.next(); return t.v; }
    return ';;';
  };

  Parser.prototype.parseBrace = function () {
    this.expect('{');
    var body = this.parseList(['}']);
    this.expect('}');
    return { type: 'brace', body: body };
  };
  Parser.prototype.parseSubshell = function () {
    this.next(); // (
    var body = this.parseList([]);
    if (this.peek().t === 'op' && this.peek().v === ')') this.next();
    return { type: 'subshell', body: body };
  };
  Parser.prototype.parseFuncDef = function () {
    this.next(); // function
    var nameTok = this.next();
    var name = wordText(nameTok);
    if (this.peek().t === 'op' && this.peek().v === '(') { this.next(); if (this.peek().t === 'op' && this.peek().v === ')') this.next(); }
    this.skipNL();
    var body = this.parseCommand();
    return { type: 'func', name: name, body: body };
  };

  Parser.prototype.parseSimple = function () {
    var words = [], redirs = [], assigns = [];
    // ведущие присваивания VAR=...
    while (true) {
      var t = this.peek();
      if (t.t === 'word' && t.arithCmd) { this.next(); return { type: 'arithcmd', expr: t.parts[0].v }; }
      if (t.t !== 'word') break;
      // [[ ... ]] как команда
      if (words.length === 0 && wordText(t) === '[[') { return this.parseDoubleBracket(); }
      if (words.length === 0 && isAssignWord(t)) { assigns.push(this.next()); continue; }
      break;
    }
    while (true) {
      var tk = this.peek();
      if (tk.t === 'word' && !tk.arithCmd) {
        var wt = wordText(tk);
        if (words.length > 0 && RESERVED.indexOf(wt) !== -1 && wt !== '{' && wt !== '}') break;
        words.push(this.next());
      } else if (tk.t === 'op' && isRedirOp(tk.v)) {
        this.next();
        if (REDIR_NOTARGET.test(tk.v)) redirs.push({ op: tk.v, target: null });
        else redirs.push({ op: tk.v, target: this.next() });
      } else break;
    }
    if (words.length === 0 && assigns.length === 0 && redirs.length === 0) {
      throw new ShellError('пустая команда или синтаксическая ошибка около «' + describeTok(this.peek()) + '»');
    }
    return { type: 'simple', words: words, assigns: assigns, redirs: redirs };
  };

  Parser.prototype.parseDoubleBracket = function () {
    this.next(); // [[
    var inner = [];
    while (!(this.peek().t === 'word' && wordText(this.peek()) === ']]')) {
      if (this.peek().t === 'eof') throw new ShellError('ожидалось «]]»');
      inner.push(this.next());
    }
    this.next(); // ]]
    return { type: 'dbracket', toks: inner };
  };

  function describeTok(t) { if (!t) return 'eof'; if (t.t === 'eof') return 'конец файла'; if (t.t === 'op') return t.v; if (t.t === 'newline') return 'newline'; return wordText(t) || t.raw || 'слово'; }
  function isAssignWord(tok) {
    if (!tok.parts || !tok.parts.length) return false;
    var first = tok.parts[0];
    if (first.s !== 'lit') return false;
    var m = first.v.match(/^([A-Za-z_][A-Za-z0-9_]*)(\+?=)/);
    return !!m;
  }

  // ======================= Раскрытие (expansion) =======================
  // Возвращает массив полей (слов) после подстановок и разбиения.
  function expandWord(sh, tok, opts) {
    opts = opts || {};
    var fields = [''];               // текущие поля
    var quotedFlags = [false];       // было ли хоть что-то в кавычках (для сохранения пустых)
    function appendStr(str) { fields[fields.length - 1] += str; }
    function splitInto(str) {
      // разбивает по IFS и начинает новые поля
      var ifs = getIFS(sh);
      if (ifs === '') { appendStr(str); return; }
      var ws = ifs.split('');
      var buf = '', started = false;
      var pieces = [];
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (ws.indexOf(ch) !== -1) { pieces.push(buf); buf = ''; started = true; }
        else { buf += ch; }
      }
      pieces.push(buf);
      // убрать ведущие/замыкающие пустые от пробелов
      // Склейка: первый кусок присоединяется к текущему полю, остальные — новые поля
      for (var k = 0; k < pieces.length; k++) {
        if (k === 0) { appendStr(pieces[0]); }
        else { fields.push(pieces[k]); quotedFlags.push(false); }
      }
    }

    var parts = tok.parts || [];
    for (var pi = 0; pi < parts.length; pi++) {
      var p = parts[pi];
      var quoted = (p.q === 'double' || p.q === 'single');
      if (p.s === 'lit') { appendStr(p.v); if (quoted) quotedFlags[quotedFlags.length - 1] = true; continue; }
      if (p.s === 'arith') { appendStr(String(evalArith(sh, p.v))); continue; }
      if (p.s === 'cmd') {
        var o = runSub(sh, p.v);
        if (p.q === 'double') appendStr(o);
        else splitInto(o);
        continue;
      }
      if (p.s === 'var') {
        var res = expandParam(sh, p, opts);
        if (res.special === 'at' && p.q === 'double') {
          // "$@" -> отдельные поля
          var arr = res.list;
          if (arr.length === 0) { /* ничего */ }
          else {
            appendStr(arr[0]); quotedFlags[quotedFlags.length - 1] = true;
            for (var ai = 1; ai < arr.length; ai++) { fields.push(arr[ai]); quotedFlags.push(true); }
          }
          continue;
        }
        if (res.special === 'at' || res.special === 'star') {
          // без кавычек: join пробелом затем split
          var joined = res.list.join(res.special === 'star' ? firstIFS(sh) : ' ');
          if (p.q === 'double') { appendStr(joined); quotedFlags[quotedFlags.length - 1] = true; }
          else splitInto(joined);
          continue;
        }
        if (p.q === 'double' || p.q === 'single') { appendStr(res.value); quotedFlags[quotedFlags.length - 1] = true; }
        else splitInto(res.value);
        continue;
      }
    }
    // Удаляем пустые поля, не бывшие в кавычках (кроме случая когда всё пусто и было в кавычках)
    var out = [];
    for (var f = 0; f < fields.length; f++) {
      if (fields[f] === '' && !quotedFlags[f]) continue;
      out.push(fields[f]);
    }
    if (out.length === 0 && quotedFlags.some(function (q) { return q; })) out = [''];
    if (out.length === 0 && parts.length && !opts.allowEmpty) return [];
    // глоб по ФС (только без кавычек и если есть * ? [)
    if (!opts.noGlob) {
      var globbed = [];
      for (var g = 0; g < out.length; g++) {
        var wasQuoted = false; // упрощение: глоб применяем ко всем безкавычным полям
        var matches = globField(sh, out[g], parts);
        if (matches) globbed = globbed.concat(matches); else globbed.push(out[g]);
      }
      out = globbed;
    }
    return out;
  }
  function firstIFS(sh) { var ifs = getIFS(sh); return ifs.length ? ifs[0] : ''; }

  function globField(sh, field, parts) {
    // применяем глоб, только если в поле есть незаэкранированные * ? [ и они пришли из безкавычного lit
    // упрощение: глобим, если в итоговом поле встречаются * ? и поле не из кавычек
    var hadUnquotedGlob = parts.some(function (p) { return p.s === 'lit' && p.q === 'none' && /[*?\[]/.test(p.v); });
    if (!hadUnquotedGlob) return null;
    if (!/[*?\[]/.test(field)) return null;
    var slash = field.lastIndexOf('/');
    var dirPart = slash >= 0 ? field.slice(0, slash) : '.';
    var patPart = slash >= 0 ? field.slice(slash + 1) : field;
    var dnode = nodeAt(sh, dirPart === '' ? '/' : dirPart);
    if (!dnode || dnode.type !== 'dir') return null;
    var re = globToRegex(patPart);
    var names = Object.keys(dnode.children).filter(function (nm) { return nm[0] !== '.' && re.test(nm); }).sort();
    if (!names.length) return null;
    return names.map(function (nm) { return (slash >= 0 ? dirPart + '/' : '') + nm; });
  }

  // ${var}, ${var:-w}, ${#var}, ${var#pat}, ${var/a/b}, $1, $@, $# …
  function expandParam(sh, p, opts) {
    var body = p.v;
    if (!p.braced) {
      return simpleParam(sh, body);
    }
    // braced: разобрать операторы
    // ${#name}
    if (body[0] === '#' && body.length > 1) {
      var nm = body.slice(1);
      if (nm === '@' || nm === '*') return { value: String(sh.positional.length) };
      var val = paramValue(sh, nm);
      return { value: String((val === undefined ? '' : val).length) };
    }
    // имя
    var m = body.match(/^([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*?#$!-])/);
    var name = m ? m[1] : '';
    var rest = body.slice(name.length);
    // спец @/*
    if (name === '@' || name === '*') {
      if (rest === '') return { special: name === '@' ? 'at' : 'star', list: sh.positional.slice() };
      // ${@:offset:len} и т.п. не поддерживаем подробно
    }
    var cur = paramValue(sh, name);
    var isNull = (cur === undefined || cur === '');
    var unset = (cur === undefined);
    if (rest === '') return { value: cur === undefined ? '' : cur };
    // операторы :- := :? :+  (с ':' учитывают пустоту)
    var colon = rest[0] === ':';
    var opch = colon ? rest[1] : rest[0];
    var arg = colon ? rest.slice(2) : rest.slice(1);
    var cond = colon ? isNull : unset;
    if (opch === '-') { return { value: cond ? expandArgWord(sh, arg) : (cur === undefined ? '' : cur) }; }
    if (opch === '=') { if (cond) { var v = expandArgWord(sh, arg); setVar(sh, name, v); return { value: v }; } return { value: cur }; }
    if (opch === '?') { if (cond) { throw new ShellError(name + ': ' + (arg ? expandArgWord(sh, arg) : 'parameter null or not set')); } return { value: cur }; }
    if (opch === '+') { return { value: cond ? '' : expandArgWord(sh, arg) }; }
    // обрезка # ## % %%
    if (rest[0] === '#') {
      var greedy = rest[1] === '#';
      var pat = rest.slice(greedy ? 2 : 1);
      return { value: trimStart(cur === undefined ? '' : cur, expandArgWord(sh, pat, true), greedy) };
    }
    if (rest[0] === '%') {
      var greedy2 = rest[1] === '%';
      var pat2 = rest.slice(greedy2 ? 2 : 1);
      return { value: trimEnd(cur === undefined ? '' : cur, expandArgWord(sh, pat2, true), greedy2) };
    }
    // замена / //
    if (rest[0] === '/') {
      var all = rest[1] === '/';
      var body2 = rest.slice(all ? 2 : 1);
      var parts2 = splitReplace(body2);
      return { value: replacePat(cur === undefined ? '' : cur, expandArgWord(sh, parts2.pat, true), expandArgWord(sh, parts2.rep), all) };
    }
    // подстрока ${var:offset:len}
    if (rest[0] === ':' && /^[0-9]/.test(rest[1] !== undefined ? rest.slice(1) : '')) {
      var sub = rest.slice(1).split(':');
      var off = parseInt(sub[0], 10) || 0; var s = cur === undefined ? '' : cur;
      if (off < 0) off = Math.max(0, s.length + off);
      var ln = sub[1] !== undefined ? parseInt(sub[1], 10) : undefined;
      return { value: ln === undefined ? s.slice(off) : s.substr(off, ln) };
    }
    return { value: cur === undefined ? '' : cur };
  }

  function paramValue(sh, name) {
    if (/^[0-9]+$/.test(name)) { var ix = parseInt(name, 10); if (ix === 0) return sh.name; return sh.positional[ix - 1]; }
    if (name === '#') return String(sh.positional.length);
    if (name === '?') return String(sh.status);
    if (name === '$') return '1000';
    if (name === '!') return '0';
    if (name === '-') return 'himBHs';
    if (name === '@' || name === '*') return sh.positional.join(' ');
    return getVar(sh, name);
  }

  function simpleParam(sh, name) {
    if (name === '@') return { special: 'at', list: sh.positional.slice() };
    if (name === '*') return { special: 'star', list: sh.positional.slice() };
    var v = paramValue(sh, name);
    return { value: v === undefined ? '' : v };
  }

  // раскрывает слово-аргумент оператора (${v:-слово}, шаблон обрезки и т.п.): $ раскрывается,
  // пробелы и шаблонные * ? сохраняются, разбиения/глоба нет (семантика двойных кавычек).
  function expandArgWord(sh, raw, patternMode) {
    var wrapped = '"' + String(raw).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    var w = readWord(wrapped, 0);
    return expandWord(sh, { parts: w.parts }, { noGlob: true, allowEmpty: true }).join('');
  }
  function splitReplace(s) {
    // делит pat/rep по первому незаэкранированному /
    var i = 0, pat = '';
    while (i < s.length) { if (s[i] === '\\' && s[i + 1] === '/') { pat += '/'; i += 2; continue; } if (s[i] === '/') break; pat += s[i]; i++; }
    var rep = s[i] === '/' ? s.slice(i + 1) : '';
    return { pat: pat, rep: rep };
  }

  // ======================= Глоб/шаблоны -> RegExp =======================
  function globToRegex(glob, anchorStart, anchorEnd) {
    var re = '';
    for (var i = 0; i < glob.length; i++) {
      var c = glob[i];
      if (c === '*') re += '.*';
      else if (c === '?') re += '.';
      else if (c === '[') {
        var j = i + 1, cls = '[';
        if (glob[j] === '!' || glob[j] === '^') { cls += '^'; j++; }
        while (j < glob.length && glob[j] !== ']') { cls += glob[j] === '\\' ? '\\\\' : glob[j]; j++; }
        cls += ']'; i = j; re += cls;
      } else if (c === '\\') { re += '\\' + (glob[i + 1] || ''); i++; }
      else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp((anchorStart === false ? '' : '^') + re + (anchorEnd === false ? '' : '$'));
  }
  function matchGlob(str, glob) { return globToRegex(glob).test(str); }

  function trimStart(s, pat, greedy) {
    // удаляет совпадение шаблона с начала (кратчайшее/наибольшее)
    var lens = [];
    for (var i = 0; i <= s.length; i++) lens.push(i);
    if (greedy) lens.reverse();
    for (var k = 0; k < lens.length; k++) {
      if (globToRegex(pat, true, true).test(s.slice(0, lens[k]))) return s.slice(lens[k]);
    }
    return s;
  }
  function trimEnd(s, pat, greedy) {
    var lens = [];
    for (var i = 0; i <= s.length; i++) lens.push(i);
    if (greedy) lens.reverse();
    for (var k = 0; k < lens.length; k++) {
      var start = s.length - lens[k];
      if (globToRegex(pat, true, true).test(s.slice(start))) return s.slice(0, start);
    }
    return s;
  }
  function replacePat(s, pat, rep, all) {
    if (pat === '') return s;
    var anchorStart = pat[0] === '#'; // не поддерживаем якоря bash # % здесь
    var re = globToRegex(pat, false, false);
    // найти первое/все совпадения (нежадно по возможности)
    var reG = new RegExp(re.source, all ? 'g' : '');
    // glob * жадный — приблизим поведение заменой по regex
    return s.replace(reG, function (m) { return rep; });
  }

  // ======================= Арифметика =======================
  // В $(( )) параметры $#, $1, $?, $name, ${…} сначала раскрываются, затем считается выражение.
  function preExpandArith(sh, expr) {
    return String(expr).replace(/\$\{([^{}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[#?@*!$-])/g, function (m, braced, simple) {
      if (braced !== undefined) {
        if (braced[0] === '#' && braced.length > 1) { var lv = paramValue(sh, braced.slice(1)); return String((lv === undefined ? '' : lv).length); }
        var bv = paramValue(sh, braced);
        return bv === undefined || bv === '' ? '0' : String(bv);
      }
      if (simple === '@' || simple === '*') return String(sh.positional.length);
      var v = paramValue(sh, simple);
      return v === undefined || v === '' ? '0' : String(v);
    });
  }
  function evalArith(sh, expr) {
    var p = new ArithParser(preExpandArith(sh, expr), sh);
    var v = p.parseComma();
    return v | 0;
  }
  function ArithParser(src, sh) { this.s = src; this.i = 0; this.sh = sh; }
  ArithParser.prototype.ws = function () { while (/\s/.test(this.s[this.i])) this.i++; };
  ArithParser.prototype.peekCh = function () { this.ws(); return this.s[this.i]; };
  ArithParser.prototype.eat = function (str) { this.ws(); if (this.s.substr(this.i, str.length) === str) { this.i += str.length; return true; } return false; };
  ArithParser.prototype.parseComma = function () { var v = this.parseAssign(); while (this.eat(',')) v = this.parseAssign(); return v; };
  ArithParser.prototype.parseAssign = function () {
    var save = this.i; this.ws();
    var m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i));
    if (m) {
      var after = this.i + m[0].length;
      var rest = this.s.slice(after).replace(/^\s*/, '');
      var opm = rest.match(/^(\+=|-=|\*=|\/=|%=|=)(?!=)/);
      if (opm) {
        var name = m[0];
        this.i = after; this.ws(); this.i += opm[1].length;
        var val = this.parseAssign();
        var cur = toNum(getVar(this.sh, name));
        var nv;
        switch (opm[1]) { case '=': nv = val; break; case '+=': nv = cur + val; break; case '-=': nv = cur - val; break; case '*=': nv = cur * val; break; case '/=': nv = trunc(cur, val); break; case '%=': nv = mod(cur, val); break; }
        setVar(this.sh, name, String(nv | 0));
        return nv | 0;
      }
    }
    this.i = save;
    return this.parseTernary();
  };
  ArithParser.prototype.parseTernary = function () { var c = this.parseOr(); if (this.eat('?')) { var a = this.parseAssign(); this.eat(':'); var b = this.parseAssign(); return c ? a : b; } return c; };
  ArithParser.prototype.parseOr = function () { var v = this.parseAnd(); while (this.eat('||')) { var r = this.parseAnd(); v = (v || r) ? 1 : 0; } return v; };
  ArithParser.prototype.parseAnd = function () { var v = this.parseEq(); while (this.eat('&&')) { var r = this.parseEq(); v = (v && r) ? 1 : 0; } return v; };
  ArithParser.prototype.parseEq = function () { var v = this.parseRel(); while (true) { if (this.eat('==')) v = (v === this.parseRel()) ? 1 : 0; else if (this.eat('!=')) v = (v !== this.parseRel()) ? 1 : 0; else break; } return v; };
  ArithParser.prototype.parseRel = function () { var v = this.parseAdd(); while (true) { if (this.eat('<=')) v = (v <= this.parseAdd()) ? 1 : 0; else if (this.eat('>=')) v = (v >= this.parseAdd()) ? 1 : 0; else if (this.eat('<')) v = (v < this.parseAdd()) ? 1 : 0; else if (this.eat('>')) v = (v > this.parseAdd()) ? 1 : 0; else break; } return v; };
  ArithParser.prototype.parseAdd = function () { var v = this.parseMul(); while (true) { this.ws(); if (this.s[this.i] === '+' && this.s[this.i + 1] !== '+') { this.i++; v += this.parseMul(); } else if (this.s[this.i] === '-' && this.s[this.i + 1] !== '-') { this.i++; v -= this.parseMul(); } else break; } return v | 0; };
  ArithParser.prototype.parseMul = function () { var v = this.parseUnary(); while (true) { if (this.eat('*')) v = v * this.parseUnary(); else if (this.eat('/')) v = trunc(v, this.parseUnary()); else if (this.eat('%')) v = mod(v, this.parseUnary()); else break; } return v | 0; };
  ArithParser.prototype.parseUnary = function () {
    this.ws();
    if (this.eat('++')) { var nm = this.readName(); var nv = toNum(getVar(this.sh, nm)) + 1; setVar(this.sh, nm, String(nv)); return nv; }
    if (this.eat('--')) { var nm2 = this.readName(); var nv2 = toNum(getVar(this.sh, nm2)) - 1; setVar(this.sh, nm2, String(nv2)); return nv2; }
    if (this.eat('!')) return this.parseUnary() ? 0 : 1;
    if (this.eat('-')) return -this.parseUnary();
    if (this.eat('+')) return this.parseUnary();
    return this.parsePrimary();
  };
  ArithParser.prototype.readName = function () { this.ws(); var m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i)); if (!m) throw new ShellError('ошибка в арифметике'); this.i += m[0].length; return m[0]; };
  ArithParser.prototype.parsePrimary = function () {
    this.ws();
    if (this.eat('(')) { var v = this.parseComma(); this.eat(')'); return v; }
    if (this.s[this.i] === '$') { this.i++; var w = readWord(this.s.slice(this.i), 0); /* грубо */ }
    var num = /^(0x[0-9a-fA-F]+|[0-9]+)/.exec(this.s.slice(this.i));
    if (num) { this.i += num[0].length; return parseInt(num[0], num[0].indexOf('0x') === 0 ? 16 : 10); }
    var nm = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i));
    if (nm) {
      this.i += nm[0].length;
      // пост-инкремент
      this.ws();
      if (this.s.substr(this.i, 2) === '++') { this.i += 2; var old = toNum(getVar(this.sh, nm[0])); setVar(this.sh, nm[0], String(old + 1)); return old; }
      if (this.s.substr(this.i, 2) === '--') { this.i += 2; var old2 = toNum(getVar(this.sh, nm[0])); setVar(this.sh, nm[0], String(old2 - 1)); return old2; }
      return toNum(getVar(this.sh, nm[0]));
    }
    throw new ShellError('ошибка в арифметическом выражении: «' + this.s + '»');
  };
  function toNum(v) { if (v === undefined || v === '') return 0; var n = parseInt(String(v).trim(), 10); return isNaN(n) ? 0 : n; }
  function trunc(a, b) { if (b === 0) throw new ShellError('деление на ноль'); return Math.trunc(a / b); }
  function mod(a, b) { if (b === 0) throw new ShellError('деление на ноль'); return a - trunc(a, b) * b; }

  // ======================= Исполнение =======================
  function execNode(sh, node) {
    step(sh);
    switch (node.type) {
      case 'list': return execList(sh, node);
      case 'andor': return execAndOr(sh, node);
      case 'pipeline': return execPipeline(sh, node);
      case 'simple': return execSimple(sh, node);
      case 'if': return execIf(sh, node);
      case 'while': return execWhile(sh, node);
      case 'for': return execFor(sh, node);
      case 'cfor': return execCFor(sh, node);
      case 'case': return execCase(sh, node);
      case 'brace': return execNode(sh, node.body);
      case 'redir': return withRedirs(sh, node.redirs, function () { return execNode(sh, node.node); });
      case 'subshell': return execSubshell(sh, node);
      case 'func': sh.funcs[node.name] = node.body; return setStatus(sh, 0);
      case 'arithcmd': { var v = evalArith(sh, node.expr); return setStatus(sh, v !== 0 ? 0 : 1); }
      case 'dbracket': return setStatus(sh, evalDoubleBracket(sh, node.toks) ? 0 : 1);
      default: throw new ShellError('неизвестный узел ' + node.type);
    }
  }
  function setStatus(sh, code) { sh.status = code | 0; return sh.status; }

  function execList(sh, node) {
    var code = 0;
    for (var i = 0; i < node.items.length; i++) { code = execNode(sh, node.items[i].node); }
    return code;
  }
  function execAndOr(sh, node) {
    var l = execNode(sh, node.left);
    if (node.op === '&&') { if (sh.status === 0) return execNode(sh, node.right); return sh.status; }
    else { if (sh.status !== 0) return execNode(sh, node.right); return sh.status; }
  }
  function execPipeline(sh, node) {
    // конвейер: вывод предыдущей команды -> stdin следующей (в подоболочке для правых частей)
    var input = null;
    var lastCode = 0;
    for (var i = 0; i < node.cmds.length; i++) {
      var isLast = i === node.cmds.length - 1;
      if (i === 0) {
        // первая команда пишет в буфер (кроме если одна команда)
        if (node.cmds.length === 1) return execNode(sh, node.cmds[0]);
      }
      // каждая часть конвейера — подоболочка со своим выводом; переменные не сохраняются (как в bash)
      var sub = forkShell(sh);
      if (input !== null) sub.stdin = splitLines(input); sub.stdinPos = 0;
      sub.out = []; sub.err = []; sub.outLen = 0; sub.errLen = 0;
      try { execNode(sub, node.cmds[i]); } catch (e) { if (e instanceof ExitSig) { sub.status = e.code; } else throw e; }
      lastCode = sub.status;
      // stderr подоболочки выводим в общий поток
      for (var k = 0; k < sub.err.length; k++) write(sh, 'err', sub.err[k]);
      var produced = sub.out.join('');
      if (isLast) { write(sh, 'out', produced); }
      input = produced;
    }
    return setStatus(sh, lastCode);
  }
  function forkShell(sh) {
    // мелкая копия для подоболочки: общая ФС-копия, копия переменных
    var sub = {
      vars: JSON.parse(JSON.stringify(sh.vars)), env: JSON.parse(JSON.stringify(sh.env)),
      positional: sh.positional.slice(), name: sh.name, status: sh.status, cwd: sh.cwd,
      root: JSON.parse(JSON.stringify(sh.root)), installed: sh.installed, stdin: sh.stdin.slice(sh.stdinPos),
      stdinPos: 0, out: [], err: [], outLen: 0, errLen: 0, steps: sh.steps, now: sh.now, funcs: sh.funcs
    };
    return sub;
  }
  function execSubshell(sh, node) {
    var sub = forkShell(sh);
    var code = 0;
    try { code = execNode(sub, node.body); } catch (e) { if (e instanceof ExitSig) code = e.code; else throw e; }
    for (var i = 0; i < sub.out.length; i++) write(sh, 'out', sub.out[i]);
    for (var k = 0; k < sub.err.length; k++) write(sh, 'err', sub.err[k]);
    sh.steps = sub.steps;
    return setStatus(sh, code);
  }

  function execIf(sh, node) {
    for (var i = 0; i < node.clauses.length; i++) {
      execNode(sh, node.clauses[i].cond);
      if (sh.status === 0) return execNode(sh, node.clauses[i].body);
    }
    if (node.elseBody) return execNode(sh, node.elseBody);
    return setStatus(sh, 0);
  }
  function execWhile(sh, node) {
    var code = 0;
    while (true) {
      step(sh);
      execNode(sh, node.cond);
      var ok = node.until ? (sh.status !== 0) : (sh.status === 0);
      if (!ok) break;
      try { code = execNode(sh, node.body); }
      catch (e) { if (e instanceof BreakSig) { if (--e.n > 0) throw e; break; } if (e instanceof ContinueSig) { if (--e.n > 0) throw e; continue; } throw e; }
    }
    return setStatus(sh, code);
  }
  function execFor(sh, node) {
    var words = [];
    if (!node.hasIn) words = sh.positional.slice();
    else for (var i = 0; i < node.words.length; i++) words = words.concat(expandWord(sh, node.words[i], {}));
    var code = 0;
    for (var w = 0; w < words.length; w++) {
      step(sh);
      setVar(sh, node.varName, words[w]);
      try { code = execNode(sh, node.body); }
      catch (e) { if (e instanceof BreakSig) { if (--e.n > 0) throw e; break; } if (e instanceof ContinueSig) { if (--e.n > 0) throw e; continue; } throw e; }
    }
    return setStatus(sh, code);
  }
  function execCFor(sh, node) {
    var code = 0;
    if (node.init.trim()) evalArith(sh, node.init);
    while (true) {
      step(sh);
      if (node.cond.trim() && evalArith(sh, node.cond) === 0) break;
      try { code = execNode(sh, node.body); }
      catch (e) { if (e instanceof BreakSig) { if (--e.n > 0) throw e; break; } if (e instanceof ContinueSig) { if (--e.n > 0) throw e; if (node.step.trim()) evalArith(sh, node.step); continue; } throw e; }
      if (node.step.trim()) evalArith(sh, node.step);
    }
    return setStatus(sh, code);
  }
  function execCase(sh, node) {
    var word = expandWord(sh, node.word, { noGlob: true, allowEmpty: true }).join(' ');
    for (var i = 0; i < node.clauses.length; i++) {
      var cl = node.clauses[i];
      var matched = cl.patterns.some(function (pt) {
        var pat = expandWord(sh, pt, { noGlob: true, allowEmpty: true }).join(' ');
        return matchGlob(word, pat);
      });
      if (matched) {
        var code = execNode(sh, cl.body);
        if (cl.term === ';&') { if (node.clauses[i + 1]) return execNode(sh, node.clauses[i + 1].body); }
        return code;
      }
    }
    return setStatus(sh, 0);
  }

  // ---- перенаправления (общие для простых и составных команд) ----
  function fileTarget(name) { return name === '/dev/null' ? { kind: 'null' } : { kind: 'file', name: name }; }
  function evalRedirs(sh, redirs) {
    var out = { kind: 'console', stream: 'out' }, err = { kind: 'console', stream: 'err' }, stdin = null;
    for (var i = 0; i < redirs.length; i++) {
      var r = redirs[i];
      var name = r.target ? expandWord(sh, r.target, { noGlob: true, allowEmpty: true }).join('') : null;
      switch (r.op) {
        case '<': { var fn = nodeAt(sh, name); stdin = fn && fn.type === 'file' ? fn.content : ''; break; }
        case '<<<': stdin = name + '\n'; break;
        case '>': out = fileTarget(name); break;
        case '>>': out = fileTarget(name); out.append = true; break;
        case '2>': err = fileTarget(name); break;
        case '2>>': err = fileTarget(name); err.append = true; break;
        case '&>': out = fileTarget(name); err = fileTarget(name); break;
        case '2>&1': err = cloneTarget(out); break;
        case '>&2': case '1>&2': out = cloneTarget(err); break;
        default: break;
      }
    }
    return { out: out, err: err, stdin: stdin };
  }
  function cloneTarget(t) { var c = {}; for (var k in t) c[k] = t[k]; return c; }
  function routeOut(sh, target, text, isErr) {
    if (target.kind === 'file') { writeFile(sh, target.name, text, target.append); return; }
    if (text === '') return;
    if (target.kind === 'console') write(sh, target.stream || (isErr ? 'err' : 'out'), text);
    // kind 'null' — отбрасываем
  }
  function withRedirs(sh, redirs, fn) {
    if (!redirs || !redirs.length) return fn();
    var plan = evalRedirs(sh, redirs);
    var savedStdin = null;
    if (plan.stdin !== null) { savedStdin = { lines: sh.stdin, pos: sh.stdinPos }; sh.stdin = splitLines(plan.stdin); sh.stdinPos = 0; }
    var defOut = plan.out.kind === 'console' && plan.out.stream === 'out';
    var defErr = plan.err.kind === 'console' && plan.err.stream === 'err';
    var needCap = !defOut || !defErr;
    var realOut = sh.out, realErr = sh.err, realOutLen = sh.outLen, realErrLen = sh.errLen;
    var capOut = [], capErr = [];
    if (needCap) { sh.out = capOut; sh.err = capErr; sh.outLen = 0; sh.errLen = 0; }
    var code;
    try { code = fn(); }
    finally {
      if (needCap) {
        sh.out = realOut; sh.err = realErr; sh.outLen = realOutLen; sh.errLen = realErrLen;
        routeOut(sh, plan.out, capOut.join(''), false);
        routeOut(sh, plan.err, capErr.join(''), true);
      }
      if (savedStdin) { sh.stdin = savedStdin.lines; sh.stdinPos = savedStdin.pos; }
    }
    return code;
  }

  // ---- простая команда ----
  function execSimple(sh, node) {
    var words = [];
    for (var i = 0; i < node.words.length; i++) words = words.concat(expandWord(sh, node.words[i], {}));
    if (words.length === 0) {
      // только присваивания -> переменные оболочки (перенаправления всё равно применяем)
      return withRedirs(sh, node.redirs, function () {
        for (var a = 0; a < node.assigns.length; a++) applyAssign(sh, node.assigns[a], false);
        return 0;
      });
    }
    for (var a2 = 0; a2 < node.assigns.length; a2++) applyAssign(sh, node.assigns[a2], true);
    var cmd = words[0];
    var args = words.slice(1);
    var code = withRedirs(sh, node.redirs, function () { return dispatch(sh, cmd, args); });
    return setStatus(sh, code);
  }

  function applyAssign(sh, tok, exportToCmd) {
    // VAR=value или VAR+=value
    var first = tok.parts[0];
    var m = first.v.match(/^([A-Za-z_][A-Za-z0-9_]*)(\+?=)(.*)$/);
    var name = m[1], op = m[2];
    // собрать значение: остаток первой части + остальные части
    var valTok = { parts: [{ s: 'lit', v: m[3], q: first.q }].concat(tok.parts.slice(1)) };
    var value = expandWord(sh, valTok, { noGlob: true, allowEmpty: true }).join('');
    if (op === '+=') value = (getVar(sh, name) || '') + value;
    setVar(sh, name, value);
  }

  function writeFile(sh, name, text, append) {
    var parts = resolve(sh, name);
    var parent = parentOf(sh, parts);
    if (!parent) throw new ShellError(name + ': нет такого каталога');
    var base = parts[parts.length - 1];
    var existing = parent.children[base];
    if (append && existing && existing.type === 'file') existing.content += text;
    else parent.children[base] = file(text);
  }

  // ======================= Команды (builtins + эмуляция) =======================
  function dispatch(sh, cmd, args) {
    if (sh.funcs[cmd]) return callFunc(sh, cmd, args);
    var fn = BUILTINS[cmd];
    if (fn) return fn(sh, args);
    throw new ShellError(cmd + ': command not found');
  }
  function callFunc(sh, name, args) {
    var savedPos = sh.positional; sh.positional = args.slice();
    var code = 0;
    try { code = execNode(sh, sh.funcs[name]); }
    catch (e) { if (e instanceof ReturnSig) code = e.code; else { sh.positional = savedPos; throw e; } }
    sh.positional = savedPos;
    return code;
  }

  function joinEcho(args) { return args.join(' '); }
  function interpretEscapes(s) {
    return s.replace(/\\(n|t|r|\\|a|b|f|v|0|e)/g, function (_, c) {
      switch (c) { case 'n': return '\n'; case 't': return '\t'; case 'r': return '\r'; case '\\': return '\\'; case 'a': return '\x07'; case 'b': return '\b'; case 'f': return '\f'; case 'v': return '\v'; case '0': return '\0'; case 'e': return '\x1b'; }
      return _;
    });
  }

  var BUILTINS = {
    'echo': function (sh, args) {
      var e = false, n = false;
      var i = 0;
      while (i < args.length && /^-(n|e|E|ne|en|nE|En)$/.test(args[i])) { if (args[i].indexOf('e') !== -1) e = true; if (args[i].indexOf('n') !== -1) n = true; if (args[i].indexOf('E') !== -1) e = false; i++; }
      var text = args.slice(i).join(' ');
      if (e) text = interpretEscapes(text);
      write(sh, 'out', text + (n ? '' : '\n'));
      return 0;
    },
    'printf': function (sh, args) {
      if (!args.length) return 0;
      var fmt = interpretEscapes(args[0]);
      var rest = args.slice(1);
      var out = '';
      var ri = 0;
      function one() {
        var res = '';
        var consumed = false;
        res = fmt.replace(/%(-?)(\d+)?(\.\d+)?([diouxXsc%])/g, function (m, minus, width, prec, conv) {
          if (conv === '%') return '%';
          consumed = true;
          var val = rest[ri++]; if (val === undefined) val = '';
          var str;
          if (conv === 's') { str = String(val); if (prec) str = str.slice(0, parseInt(prec.slice(1), 10)); }
          else if (conv === 'c') { str = String(val)[0] || ''; }
          else { var num = parseInt(val, 10) || 0; str = String(num); }
          if (width) { var w = parseInt(width, 10); while (str.length < w) { str = minus ? str + ' ' : ' ' + str; } }
          return str;
        });
        return res;
      }
      if (rest.length === 0) { out = one(); }
      else { while (ri < rest.length) { var before = ri; out += one(); if (ri === before) break; } }
      write(sh, 'out', out);
      return 0;
    },
    'read': function (sh, args) {
      var opts = { p: null, s: false, r: false, a: null };
      var names = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a === '-p') { opts.p = args[++i]; }
        else if (a === '-r') opts.r = true;
        else if (a === '-s') opts.s = true;
        else if (a === '-sr' || a === '-rs') { opts.s = true; opts.r = true; }
        else if (a[0] === '-') { /* прочие ключи игнор */ }
        else names.push(a);
      }
      if (opts.p) write(sh, 'err', opts.p); // приглашение read -p идёт в stderr, как в настоящем bash
      if (sh.stdinPos >= sh.stdin.length) return 1; // EOF
      var line = sh.stdin[sh.stdinPos++];
      if (names.length === 0) { setVar(sh, 'REPLY', line); return 0; }
      var ifs = getIFS(sh);
      var fields = ifs === '' ? [line] : line.split(new RegExp('[' + ifs.replace(/[-\]\\]/g, '\\$&') + ']+')).filter(function (x, idx, arr) { return !(x === '' && (idx === 0 || idx === arr.length - 1)); });
      if (fields.length === 0) fields = [''];
      for (var k = 0; k < names.length; k++) {
        if (k === names.length - 1) setVar(sh, names[k], fields.slice(k).join(ifs[0] || ' '));
        else setVar(sh, names[k], fields[k] === undefined ? '' : fields[k]);
      }
      return 0;
    },
    'true': function () { return 0; },
    'false': function () { return 1; },
    ':': function () { return 0; },
    'exit': function (sh, args) { throw new ExitSig(args.length ? (parseInt(args[0], 10) || 0) : sh.status); },
    'return': function (sh, args) { throw new ReturnSig(args.length ? (parseInt(args[0], 10) || 0) : sh.status); },
    'break': function (sh, args) { throw new BreakSig(args.length ? (parseInt(args[0], 10) || 1) : 1); },
    'continue': function (sh, args) { throw new ContinueSig(args.length ? (parseInt(args[0], 10) || 1) : 1); },
    'shift': function (sh, args) { var n = args.length ? (parseInt(args[0], 10) || 0) : 1; sh.positional = sh.positional.slice(n); return 0; },
    'set': function (sh, args) {
      if (args[0] === '--') { sh.positional = args.slice(1); return 0; }
      if (args.length && args[0][0] !== '-' && args[0][0] !== '+') { sh.positional = args.slice(); }
      return 0;
    },
    'unset': function (sh, args) { for (var i = 0; i < args.length; i++) { if (args[i][0] !== '-') unsetVar(sh, args[i]); } return 0; },
    'export': function (sh, args) {
      if (!args.length) return 0;
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        var m = a.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m) setVar(sh, m[1], m[2], { exported: true });
        else { var name = a; if (isSet(sh, name)) { var v = getVar(sh, name); setVar(sh, name, v, { exported: true }); } else setVar(sh, name, '', { exported: true }); }
      }
      return 0;
    },
    'readonly': function (sh, args) {
      for (var i = 0; i < args.length; i++) { var m = args[i].match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (m) setVar(sh, m[1], m[2], { readonly: true }); else setVar(sh, args[i], getVar(sh, args[i]) || '', { readonly: true }); }
      return 0;
    },
    'local': function (sh, args) { for (var i = 0; i < args.length; i++) { var m = args[i].match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/); if (m) setVar(sh, m[1], m[2]); else if (!isSet(sh, args[i])) setVar(sh, args[i], ''); } return 0; },
    'declare': function (sh, args) { return BUILTINS.local(sh, args.filter(function (a) { return a[0] !== '-'; })); },
    'let': function (sh, args) { var last = 0; for (var i = 0; i < args.length; i++) last = evalArith(sh, args[i]); return last !== 0 ? 0 : 1; },
    'test': function (sh, args) { return evalTest(sh, args) ? 0 : 1; },
    '[': function (sh, args) { if (args[args.length - 1] !== ']') throw new ShellError('[: ожидалась «]»'); return evalTest(sh, args.slice(0, -1)) ? 0 : 1; },
    'cd': function (sh, args) {
      var dest = args[0] || sh.env.HOME; if (dest === '-') dest = sh.env.OLDPWD || sh.cwd;
      var parts = resolve(sh, dest); var node = nodeAt(sh, parts);
      if (!node) { write(sh, 'err', 'cd: ' + dest + ': No such file or directory\n'); return 1; }
      if (node.type !== 'dir') { write(sh, 'err', 'cd: ' + dest + ': Not a directory\n'); return 1; }
      sh.env.OLDPWD = sh.cwd; sh.cwd = '/' + parts.join('/'); sh.env.PWD = sh.cwd; return 0;
    },
    'pwd': function (sh) { write(sh, 'out', sh.cwd + '\n'); return 0; },
    'whoami': function (sh) { write(sh, 'out', sh.env.USER + '\n'); return 0; },
    'basename': function (sh, args) { var p = (args[0] || '').replace(/\/+$/, ''); var b = p.split('/').pop(); if (args[1] && b.slice(-args[1].length) === args[1]) b = b.slice(0, -args[1].length); write(sh, 'out', b + '\n'); return 0; },
    'dirname': function (sh, args) { var p = (args[0] || '').replace(/\/+$/, ''); var i = p.lastIndexOf('/'); write(sh, 'out', (i <= 0 ? (i === 0 ? '/' : '.') : p.slice(0, i)) + '\n'); return 0; },
    'seq': function (sh, args) {
      var first = 1, inc = 1, last;
      args = args.filter(function (a) { return a[0] !== '-' || /^-?\d/.test(a); });
      if (args.length === 1) { last = +args[0]; }
      else if (args.length === 2) { first = +args[0]; last = +args[1]; }
      else { first = +args[0]; inc = +args[1]; last = +args[2]; }
      var out = [];
      if (inc > 0) { for (var i = first; i <= last; i += inc) out.push(i); }
      else if (inc < 0) { for (var j = first; j >= last; j += inc) out.push(j); }
      write(sh, 'out', out.length ? out.join('\n') + '\n' : '');
      return 0;
    },
    'cat': function (sh, args) {
      var files = args.filter(function (a) { return a[0] !== '-'; });
      if (!files.length) { write(sh, 'out', sh.stdin.slice(sh.stdinPos).join('\n') + (sh.stdin.length ? '\n' : '')); sh.stdinPos = sh.stdin.length; return 0; }
      var code = 0;
      for (var i = 0; i < files.length; i++) { var n = nodeAt(sh, files[i]); if (!n || n.type !== 'file') { write(sh, 'err', 'cat: ' + files[i] + ': No such file or directory\n'); code = 1; } else write(sh, 'out', n.content); }
      return code;
    },
    'wc': function (sh, args) {
      var opt = ''; var files = [];
      for (var i = 0; i < args.length; i++) { if (args[i][0] === '-') opt += args[i].slice(1); else files.push(args[i]); }
      function count(text) { var lines = text === '' ? 0 : (text.split('\n').length - (text[text.length - 1] === '\n' ? 1 : 0)); var words = text.split(/\s+/).filter(Boolean).length; var chars = text.length; return { l: lines, w: words, c: chars }; }
      var texts = [];
      if (!files.length) { texts.push({ name: '', text: sh.stdin.slice(sh.stdinPos).join('\n') + (sh.stdin.length > sh.stdinPos ? '\n' : '') }); sh.stdinPos = sh.stdin.length; }
      else for (var f = 0; f < files.length; f++) { var n = nodeAt(sh, files[f]); texts.push({ name: files[f], text: n && n.type === 'file' ? n.content : '' }); }
      for (var t = 0; t < texts.length; t++) {
        var c = count(texts[t].text);
        var parts = [];
        if (opt.indexOf('l') !== -1) parts.push(c.l);
        if (opt.indexOf('w') !== -1) parts.push(c.w);
        if (opt.indexOf('c') !== -1) parts.push(c.c);
        if (!opt) parts = [c.l, c.w, c.c];
        write(sh, 'out', parts.join(' ') + (texts[t].name ? ' ' + texts[t].name : '') + '\n');
      }
      return 0;
    },
    'ls': function (sh, args) {
      var opt = ''; var paths = [];
      for (var i = 0; i < args.length; i++) { if (args[i][0] === '-') opt += args[i].slice(1); else paths.push(args[i]); }
      if (!paths.length) paths = ['.'];
      var code = 0;
      for (var p = 0; p < paths.length; p++) {
        var n = nodeAt(sh, paths[p]);
        if (!n) { write(sh, 'err', 'ls: cannot access \'' + paths[p] + '\': No such file or directory\n'); code = 2; continue; }
        var names;
        if (n.type === 'dir') names = Object.keys(n.children).filter(function (nm) { return opt.indexOf('a') !== -1 || nm[0] !== '.'; }).sort();
        else names = [paths[p]];
        if (opt.indexOf('1') !== -1 || opt.indexOf('l') !== -1) write(sh, 'out', names.join('\n') + (names.length ? '\n' : ''));
        else write(sh, 'out', names.join('  ') + (names.length ? '\n' : ''));
      }
      return code;
    },
    'grep': function (sh, args) {
      var opt = { q: false, i: false, c: false, v: false, n: false, E: false, w: false };
      var pat = null; var files = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a[0] === '-' && a.length > 1 && a !== '-') { for (var k = 1; k < a.length; k++) { if (opt[a[k]] !== undefined) opt[a[k]] = true; } }
        else if (pat === null) pat = a; else files.push(a);
      }
      var texts = [];
      if (!files.length) { texts.push(sh.stdin.slice(sh.stdinPos).join('\n')); sh.stdinPos = sh.stdin.length; }
      else for (var f = 0; f < files.length; f++) { var n = nodeAt(sh, files[f]); texts.push(n && n.type === 'file' ? n.content : ''); }
      var flags = opt.i ? 'i' : '';
      var src = opt.E ? pat : pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (opt.w) src = '\\b' + src + '\\b';
      var re = new RegExp(src, flags);
      var found = 0; var matched = [];
      for (var t = 0; t < texts.length; t++) {
        var lines = texts[t].split('\n'); if (lines[lines.length - 1] === '') lines.pop();
        for (var li = 0; li < lines.length; li++) { var hit = re.test(lines[li]); if (opt.v) hit = !hit; if (hit) { found++; matched.push((opt.n ? (li + 1) + ':' : '') + lines[li]); } }
      }
      if (opt.c) { write(sh, 'out', found + '\n'); return found ? 0 : 1; }
      if (!opt.q) write(sh, 'out', matched.length ? matched.join('\n') + '\n' : '');
      return found ? 0 : 1;
    },
    'head': function (sh, args) { return headTail(sh, args, true); },
    'tail': function (sh, args) { return headTail(sh, args, false); },
    'date': function (sh, args) {
      var fmt = null;
      for (var i = 0; i < args.length; i++) { if (args[i][0] === '+') fmt = args[i].slice(1); }
      write(sh, 'out', formatDate(sh.now, fmt) + '\n');
      return 0;
    },
    'env': function (sh) { for (var k in sh.env) write(sh, 'out', k + '=' + sh.env[k] + '\n'); return 0; },
    'sleep': function () { return 0; },
    'clear': function () { return 0; },
    'touch': function (sh, args) { for (var i = 0; i < args.length; i++) { if (args[i][0] === '-') continue; var parts = resolve(sh, args[i]); var parent = parentOf(sh, parts); if (parent && !parent.children[parts[parts.length - 1]]) parent.children[parts[parts.length - 1]] = file(''); } return 0; },
    'mkdir': function (sh, args) { var p2 = args.filter(function (a) { return a[0] !== '-'; }); for (var i = 0; i < p2.length; i++) { var parts = resolve(sh, p2[i]); var parent = parentOf(sh, parts); if (!parent) { write(sh, 'err', 'mkdir: ' + p2[i] + ': No such file or directory\n'); return 1; } var b = parts[parts.length - 1]; if (parent.children[b]) { write(sh, 'err', 'mkdir: ' + p2[i] + ': File exists\n'); return 1; } parent.children[b] = dir(); } return 0; },
    'rmdir': function (sh, args) { for (var i = 0; i < args.length; i++) { if (args[i][0] === '-') continue; var parts = resolve(sh, args[i]); var parent = parentOf(sh, parts); var b = parts[parts.length - 1]; if (parent && parent.children[b] && parent.children[b].type === 'dir') delete parent.children[b]; } return 0; },
    'rm': function (sh, args) { var p2 = args.filter(function (a) { return a[0] !== '-'; }); for (var i = 0; i < p2.length; i++) { var parts = resolve(sh, p2[i]); var parent = parentOf(sh, parts); var b = parts[parts.length - 1]; if (parent && parent.children[b]) delete parent.children[b]; } return 0; },
    'command': function (sh, args) { if (args[0] === '-v') { var name = args[1]; if (BUILTINS[name] || sh.funcs[name] || sh.installed.indexOf(name) !== -1) { write(sh, 'out', name + '\n'); return 0; } return 1; } if (args.length) return dispatch(sh, args[0], args.slice(1)); return 0; },
    'which': function (sh, args) { var name = args[0]; if (sh.installed.indexOf(name) !== -1 || BUILTINS[name]) { write(sh, 'out', '/usr/bin/' + name + '\n'); return 0; } return 1; },
    'type': function (sh, args) { var name = args[0]; if (BUILTINS[name]) { write(sh, 'out', name + ' is a shell builtin\n'); return 0; } if (sh.installed.indexOf(name) !== -1) { write(sh, 'out', name + ' is /usr/bin/' + name + '\n'); return 0; } return 1; },
    'expr': function (sh, args) { return exprCmd(sh, args); },
    'bc': function (sh, args) { return bcCmd(sh, args); }
  };

  function headTail(sh, args, head) {
    var num = 10; var files = [];
    for (var i = 0; i < args.length; i++) { if (args[i] === '-n') { num = parseInt(args[++i], 10); } else if (/^-\d+$/.test(args[i])) num = parseInt(args[i].slice(1), 10); else if (args[i][0] !== '-') files.push(args[i]); }
    var texts = [];
    if (!files.length) { texts.push(sh.stdin.slice(sh.stdinPos).join('\n')); sh.stdinPos = sh.stdin.length; }
    else for (var f = 0; f < files.length; f++) { var n = nodeAt(sh, files[f]); texts.push(n && n.type === 'file' ? n.content : ''); }
    for (var t = 0; t < texts.length; t++) {
      var lines = texts[t].split('\n'); var trailing = lines[lines.length - 1] === ''; if (trailing) lines.pop();
      var sel = head ? lines.slice(0, num) : lines.slice(-num);
      write(sh, 'out', sel.join('\n') + (sel.length ? '\n' : ''));
    }
    return 0;
  }

  function exprCmd(sh, args) {
    // expr считает, когда операнды и оператор — отдельные аргументы (пробелы обязательны). Один слипшийся
    // аргумент («5*2») expr просто печатает как строку — как настоящий expr.
    if (args.length === 1) { write(sh, 'out', args[0] + '\n'); return args[0] === '0' || args[0] === '' ? 1 : 0; }
    var expr = args.join(' ').replace(/\\\*/g, '*');
    try {
      var val = evalArith(sh, expr);
      write(sh, 'out', val + '\n');
      return val !== 0 ? 0 : 1;
    } catch (e) {
      write(sh, 'out', expr + '\n');
      return 2;
    }
  }

  function bcCmd(sh, args) {
    // читаем выражение из stdin (echo "scale=2; 10/3" | bc). Поддержка scale и + - * / ( )
    var input = sh.stdin.slice(sh.stdinPos).join('\n'); sh.stdinPos = sh.stdin.length;
    var lines = input.split('\n').filter(function (l) { return l.trim() !== ''; });
    var scale = 0;
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var parts = lines[i].split(';');
      for (var p = 0; p < parts.length; p++) {
        var seg = parts[p].trim(); if (seg === '') continue;
        var sm = seg.match(/^scale\s*=\s*(\d+)$/);
        if (sm) { scale = parseInt(sm[1], 10); continue; }
        try { out.push(bcEval(seg, scale)); } catch (e) { write(sh, 'err', '(standard_in): синтаксическая ошибка\n'); }
      }
    }
    if (out.length) write(sh, 'out', out.join('\n') + '\n');
    return 0;
  }
  function bcEval(expr, scale) {
    // безопасный разбор арифметики с дробями
    var val = evalFloatExpr(expr);
    if (scale === 0) { return String(Math.trunc(val)); }
    var s = val.toFixed(scale);
    // bc не округляет, а отбрасывает; эмулируем усечение
    var factor = Math.pow(10, scale);
    var tr = Math.trunc(val * factor) / factor;
    return tr.toFixed(scale);
  }
  function evalFloatExpr(expr) {
    var p = new FloatParser(expr); var v = p.parseAdd(); return v;
  }
  function FloatParser(s) { this.s = s; this.i = 0; }
  FloatParser.prototype.ws = function () { while (/\s/.test(this.s[this.i])) this.i++; };
  FloatParser.prototype.parseAdd = function () { var v = this.parseMul(); while (true) { this.ws(); var c = this.s[this.i]; if (c === '+') { this.i++; v += this.parseMul(); } else if (c === '-') { this.i++; v -= this.parseMul(); } else break; } return v; };
  FloatParser.prototype.parseMul = function () { var v = this.parseUn(); while (true) { this.ws(); var c = this.s[this.i]; if (c === '*') { this.i++; v *= this.parseUn(); } else if (c === '/') { this.i++; v /= this.parseUn(); } else if (c === '%') { this.i++; v %= this.parseUn(); } else break; } return v; };
  FloatParser.prototype.parseUn = function () { this.ws(); if (this.s[this.i] === '-') { this.i++; return -this.parseUn(); } return this.parsePrim(); };
  FloatParser.prototype.parsePrim = function () { this.ws(); if (this.s[this.i] === '(') { this.i++; var v = this.parseAdd(); this.ws(); if (this.s[this.i] === ')') this.i++; return v; } var m = /^\d+(\.\d+)?/.exec(this.s.slice(this.i)); if (!m) throw new Error('bc'); this.i += m[0].length; return parseFloat(m[0]); };

  function formatDate(d, fmt) {
    if (!fmt) return d.toString();
    var pad = function (n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; };
    return fmt.replace(/%([YmdHMSjeAaBbp%])/g, function (_, c) {
      switch (c) {
        case 'Y': return d.getFullYear();
        case 'm': return pad(d.getMonth() + 1);
        case 'd': return pad(d.getDate());
        case 'H': return pad(d.getHours());
        case 'M': return pad(d.getMinutes());
        case 'S': return pad(d.getSeconds());
        case '%': return '%';
        default: return _;
      }
    });
  }

  // ======================= test / [ ] =======================
  function evalTest(sh, args) {
    if (args.length === 0) return false;
    return testExpr(sh, args, 0, args.length);
  }
  function testExpr(sh, a, lo, hi) {
    // обрабатываем ! -a -o и скобки, затем примитивы
    return orExpr(sh, a, lo, hi);
  }
  function orExpr(sh, a, lo, hi) {
    // поиск -o на верхнем уровне
    var idx = findTop(a, lo, hi, '-o');
    if (idx !== -1) return orExpr(sh, a, lo, idx) || orExpr(sh, a, idx + 1, hi);
    return andExpr(sh, a, lo, hi);
  }
  function andExpr(sh, a, lo, hi) {
    var idx = findTop(a, lo, hi, '-a');
    if (idx !== -1) return andExpr(sh, a, lo, idx) && andExpr(sh, a, idx + 1, hi);
    return notExpr(sh, a, lo, hi);
  }
  function findTop(a, lo, hi, op) { var depth = 0; for (var i = lo; i < hi; i++) { if (a[i] === '(') depth++; else if (a[i] === ')') depth--; else if (depth === 0 && a[i] === op) return i; } return -1; }
  function notExpr(sh, a, lo, hi) {
    if (a[lo] === '!') return !notExpr(sh, a, lo + 1, hi);
    if (a[lo] === '(' && a[hi - 1] === ')') return testExpr(sh, a, lo + 1, hi - 1);
    return prim(sh, a, lo, hi);
  }
  function prim(sh, a, lo, hi) {
    var n = hi - lo;
    if (n === 0) return false;
    if (n === 1) return a[lo] !== ''; // [ str ] истина если непусто
    if (n === 2) { // унарный оператор
      var op = a[lo], v = a[lo + 1];
      return unaryTest(sh, op, v);
    }
    if (n === 3) {
      var l = a[lo], o = a[lo + 1], r = a[lo + 2];
      return binaryTest(sh, l, o, r);
    }
    // длиннее: попробуем как есть первые 3
    return binaryTest(sh, a[lo], a[lo + 1], a[lo + 2]);
  }
  function unaryTest(sh, op, v) {
    switch (op) {
      case '-z': return v === '';
      case '-n': return v !== '';
      case '-e': return !!nodeAt(sh, v);
      case '-f': { var f = nodeAt(sh, v); return !!f && f.type === 'file'; }
      case '-d': { var d = nodeAt(sh, v); return !!d && d.type === 'dir'; }
      case '-s': { var s = nodeAt(sh, v); return !!s && s.type === 'file' && s.content.length > 0; }
      case '-r': return !!nodeAt(sh, v);
      case '-w': return !!nodeAt(sh, v);
      case '-x': { var x = nodeAt(sh, v); return !!x && (x.type === 'dir' || (x.mode && (x.mode & 1))); }
      case '-L': case '-h': { var l = nodeAt(sh, v); return !!l && l.type === 'link'; }
      default: return (op + v) !== '';
    }
  }
  function binaryTest(sh, l, op, r) {
    switch (op) {
      case '=': case '==': return l === r;
      case '!=': return l !== r;
      case '<': return l < r;
      case '>': return l > r;
      case '-eq': return intEq(l, r, function (a, b) { return a === b; });
      case '-ne': return intEq(l, r, function (a, b) { return a !== b; });
      case '-gt': return intEq(l, r, function (a, b) { return a > b; });
      case '-lt': return intEq(l, r, function (a, b) { return a < b; });
      case '-ge': return intEq(l, r, function (a, b) { return a >= b; });
      case '-le': return intEq(l, r, function (a, b) { return a <= b; });
      case '-nt': { var f1 = nodeAt(sh, l), f2 = nodeAt(sh, r); return (f1 ? (f1.mtime || 0) : 0) > (f2 ? (f2.mtime || 0) : 0); }
      case '-ot': { var g1 = nodeAt(sh, l), g2 = nodeAt(sh, r); return (g1 ? (g1.mtime || 0) : 0) < (g2 ? (g2.mtime || 0) : 0); }
      default: return false;
    }
  }
  function intEq(l, r, cmp) {
    if (!/^-?\d+$/.test(String(l).trim()) || !/^-?\d+$/.test(String(r).trim())) throw new ShellError('integer expression expected');
    return cmp(parseInt(l, 10), parseInt(r, 10));
  }

  // ======================= [[ ]] =======================
  function evalDoubleBracket(sh, toks) {
    // раскрываем токены-слова, но == != =~ и шаблоны обрабатываем особо
    // упрощённо: поддержим  [[ A op B ]], !, &&, ||, ( )
    var items = toks.slice();
    return dbOr(sh, items, 0, items.length).value;
  }
  function dbOr(sh, t, lo, hi) {
    var idx = dbFindTop(t, lo, hi, '||');
    if (idx !== -1) { var l = dbOr(sh, t, lo, idx); if (l.value) return { value: true }; return dbOr(sh, t, idx + 1, hi); }
    return dbAnd(sh, t, lo, hi);
  }
  function dbAnd(sh, t, lo, hi) {
    var idx = dbFindTop(t, lo, hi, '&&');
    if (idx !== -1) { var l = dbAnd(sh, t, lo, idx); if (!l.value) return { value: false }; return dbAnd(sh, t, idx + 1, hi); }
    return dbNot(sh, t, lo, hi);
  }
  function dbFindTop(t, lo, hi, op) { var depth = 0; for (var i = lo; i < hi; i++) { if (t[i].t === 'op' && t[i].v === '(') depth++; else if (t[i].t === 'op' && t[i].v === ')') depth--; else if (depth === 0 && t[i].t === 'op' && t[i].v === op) return i; } return -1; }
  function dbNot(sh, t, lo, hi) {
    if (lo < hi && t[lo].t === 'word' && wordText(t[lo]) === '!') return { value: !dbNot(sh, t, lo + 1, hi).value };
    if (lo < hi && t[lo].t === 'op' && t[lo].v === '(' && t[hi - 1].t === 'op' && t[hi - 1].v === ')') return dbOr(sh, t, lo + 1, hi - 1);
    return dbPrim(sh, t, lo, hi);
  }
  function dbPrim(sh, t, lo, hi) {
    var words = [];
    for (var i = lo; i < hi; i++) words.push(t[i]);
    if (words.length === 0) return { value: false };
    function exp(tok, noglob) { return expandWord(sh, tok, { noGlob: true, allowEmpty: true }).join(' '); }
    if (words.length === 1) return { value: exp(words[0]) !== '' };
    if (words.length === 2) return { value: unaryTest(sh, wordText(words[0]) || expRaw(words[0]), exp(words[1])) };
    // бинарные
    var opTok = words[1];
    var opv = opTok.t === 'op' ? opTok.v : (wordText(opTok) || opRaw(opTok));
    var left = exp(words[0]);
    if (opv === '=~') { var reSrc = wordRawText(words[2]); var re = new RegExp(reSrc); return { value: re.test(left) }; }
    if (opv === '==' || opv === '=' || opv === '!=') {
      // правая часть — шаблон (без кавычек -> glob)
      var right = exp(words[2]);
      var m = matchGlob(left, right);
      return { value: opv === '!=' ? !m : m };
    }
    var rightV = exp(words[2]);
    return { value: binaryTest(sh, left, opv, rightV) };
  }
  function expRaw(tok) { return wordText(tok); }
  function opRaw(tok) { return tok.parts ? tok.parts.map(function (p) { return p.v; }).join('') : ''; }
  function wordRawText(tok) { return tok.parts ? tok.parts.map(function (p) { return p.v; }).join('') : ''; }

  // ======================= Подстановка команды =======================
  function runSub(sh, src) {
    var sub = forkShell(sh);
    sub.out = []; sub.err = []; sub.outLen = 0; sub.errLen = 0;
    try { var ast = new Parser(tokenize(src)).parseProgram(); execNode(sub, ast); }
    catch (e) { if (e instanceof ExitSig) sub.status = e.code; else if (e instanceof ShellError) { /* ошибка в подстановке */ } else throw e; }
    sh.steps = sub.steps; sh.status = sub.status;
    for (var k = 0; k < sub.err.length; k++) write(sh, 'err', sub.err[k]);
    var text = sub.out.join('');
    return text.replace(/\n+$/, ''); // $() обрезает замыкающие \n
  }

  // ======================= Точка входа =======================
  function run(script, opts) {
    var sh = createShell(opts || {});
    var result = { stdout: '', stderr: '', code: 0, error: null };
    try {
      var toks = tokenize(String(script || ''));
      var ast = new Parser(toks).parseProgram();
      var code = execNode(sh, ast);
      result.code = sh.status;
    } catch (e) {
      if (e instanceof ExitSig) { result.code = e.code; }
      else if (e instanceof ShellError) { write(sh, 'err', sh.name + ': ' + e.message + '\n'); result.code = 2; result.error = e.message; }
      else if (e instanceof BreakSig || e instanceof ContinueSig) { result.code = 0; }
      else { result.error = (e && e.message) || String(e); write(sh, 'err', 'bash: внутренняя ошибка: ' + result.error + '\n'); result.code = 2; }
    }
    result.stdout = sh.out.join('');
    result.stderr = sh.err.join('');
    return result;
  }

  // Синтаксическая проверка без выполнения: null, если скрипт разбирается, иначе текст ошибки.
  function parseCheck(script) {
    try { new Parser(tokenize(String(script || ''))).parseProgram(); return null; }
    catch (e) { if (e instanceof ShellError) return e.message; return (e && e.message) || String(e); }
  }

  return {
    run: run,
    parseCheck: parseCheck,
    createShell: createShell,
    tokenize: tokenize,
    _evalArith: function (expr, env) { return evalArith(createShell({ env: env || {} }), expr); },
    _globToRegex: globToRegex,
    MAX_STEPS: MAX_STEPS
  };
}));

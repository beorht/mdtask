// Runs a student's Python program in the browser (Pyodide = CPython in WebAssembly), off
// the main thread so an endless loop can be stopped by terminating the worker.
// Message in:  { files: { name: code }, main: 'main.py' }
// Messages out: { type: 'status' | 'running' | 'out' | 'err' | 'done' | 'fail', text }
var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

importScripts(PYODIDE_URL + 'pyodide.js');

var ready = null;
var runCount = 0;

function boot() {
  if (!ready) {
    self.postMessage({ type: 'status', text: 'Загружаю Python (только при первом запуске, ~10 МБ)…' });
    ready = loadPyodide({ indexURL: PYODIDE_URL }).then(function (py) {
      return py.loadPackage('sqlite3').then(function () {
        py.setStdout({ batched: function (s) { self.postMessage({ type: 'out', text: s + '\n' }); } });
        py.setStderr({ batched: function (s) { self.postMessage({ type: 'err', text: s + '\n' }); } });
        py.setStdin({ error: true });
        return py;
      });
    });
  }
  return ready;
}

// Each run gets a fresh empty directory (so a .db file from the previous run is gone) and
// forgets the student's modules imported last time (so an edited mydb.py is re-read).
var RUNNER = [
  'import builtins, os, sys, traceback',
  'def __no_input(prompt=""):',
  '    raise RuntimeError("input() здесь не работает: ввода с клавиатуры нет, задайте данные прямо в коде")',
  'builtins.input = __no_input',
  'def __run(files, main, workdir):',
  '    os.makedirs(workdir)',
  '    os.chdir(workdir)',
  '    for name, code in files.items():',
  '        with open(name, "w", encoding="utf-8") as f:',
  '            f.write(code)',
  '        sys.modules.pop(name[:-3], None)',
  '    if workdir not in sys.path:',
  '        sys.path.insert(0, workdir)',
  '    for p in [p for p in sys.path if p.startswith("/run/")]:',
  '        if p != workdir: sys.path.remove(p)',
  '    try:',
  '        code = compile(files[main], main, "exec")',
  '        exec(code, {"__name__": "__main__", "__file__": main})',
  '        return True',
  '    except SystemExit:',
  '        return True',
  '    except BaseException:',
  '        etype, value, tb = sys.exc_info()',
  '        traceback.print_exception(etype, value, tb.tb_next)',
  '        return False',
].join('\n');

self.onmessage = function (event) {
  var msg = event.data;
  boot()
    .then(function (py) {
      runCount += 1;
      self.postMessage({ type: 'running' });
      py.runPython(RUNNER);
      var files = py.toPy(msg.files);
      var ok = py.globals.get('__run')(files, msg.main, '/run/' + runCount);
      files.destroy();
      self.postMessage({ type: 'done', ok: ok });
    })
    .catch(function (err) {
      self.postMessage({ type: 'fail', text: String(err && err.message ? err.message : err) });
    });
};

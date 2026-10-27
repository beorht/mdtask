"""
Проверка решений курса «Начальный Python» на тестах из content/python-course/**/tasks.json — по тем же правилам, что
на сайте (лишние пробелы в конце строк и пустые строки в конце вывода не считаются).

  python3 scripts/python-course/check.py --all          — все эталонные решения (scripts/python-course/solutions/)
  python3 scripts/python-course/check.py file.py <id>   — свой файл на тестах задачи <id>

Выход: JSON-строка {"checked": n, "failed": [{"id", "test", "error"}]} при --all; при проверке файла — по строке на тест.
Код выполняется здесь же, в отдельном пространстве имён, с подменой ввода и вывода (input() без подсказок), во
временной папке с файлами теста и с учебными модулями задачи (content/python-course/shims/) — как в браузере.
"""

import builtins
import contextlib
import glob
import io
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def normalize(text):
    lines = [line.rstrip(' \t') for line in text.replace('\r\n', '\n').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


SHIMS = os.path.join(ROOT, 'content', 'python-course', 'shims')


def run(code, lines, files=None, modules=()):
    feed = iter(lines)

    def fake_input(prompt=''):
        try:
            return next(feed)
        except StopIteration:
            raise EOFError('нет строк ввода')

    out = io.StringIO()
    old_input, old_cwd = builtins.input, os.getcwd()
    saved = {name: sys.modules.get(name) for name in modules}
    env = dict(os.environ)
    builtins.input = fake_input
    with tempfile.TemporaryDirectory() as work:
        os.chdir(work)
        try:
            for name, text in (files or {}).items():
                with open(name, 'w', encoding='utf-8') as f:
                    f.write(text)
            with contextlib.redirect_stdout(out):
                for name in modules:
                    mod = type(sys)(name)
                    with open(os.path.join(SHIMS, name + '.py'), encoding='utf-8') as f:
                        exec(compile(f.read(), name + '.py', 'exec'), mod.__dict__)
                    sys.modules[name] = mod
                try:
                    exec(compile(code, '<solution>', 'exec'), {'__name__': '__main__'})
                except SystemExit:
                    pass
        finally:
            builtins.input = old_input
            os.chdir(old_cwd)
            os.environ.clear()
            os.environ.update(env)
            for name, old in saved.items():
                if old is None:
                    sys.modules.pop(name, None)
                else:
                    sys.modules[name] = old
    return out.getvalue()


def tasks():
    for path in sorted(glob.glob(os.path.join(ROOT, 'content', 'python-course', '*', '*', 'tasks.json'))):
        with open(path) as f:
            yield from json.load(f)


def check(code, task):
    for i, test in enumerate(task['tests'], 1):
        try:
            got = run(code, test['input'], test.get('files'), task.get('modules', []))
        except Exception as e:  # noqa: BLE001 — любая ошибка решения — провал теста
            yield i, f'{type(e).__name__}: {e}'
            continue
        if normalize(got) != normalize(test['output']):
            yield i, f'вывод {got!r}, нужно {test["output"]!r}'


if __name__ == '__main__':
    if sys.argv[1:] == ['--all']:
        failed, checked = [], 0
        for task in tasks():
            with open(os.path.join(ROOT, 'scripts', 'python-course', 'solutions', task['id'] + '.py')) as f:
                code = f.read()
            checked += 1
            failed += [{'id': task['id'], 'test': i, 'error': err} for i, err in check(code, task)]
        print(json.dumps({'checked': checked, 'failed': failed}, ensure_ascii=False))
    else:
        file, task_id = sys.argv[1], sys.argv[2]
        task = next(t for t in tasks() if t['id'] == task_id)
        with open(file) as f:
            code = f.read()
        bad = dict(check(code, task))
        for i in range(1, len(task['tests']) + 1):
            print(f'тест {i}: ' + ('ок' if i not in bad else bad[i]))

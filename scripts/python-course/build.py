"""
Собирает урок курса «Начальный Python» из описания scripts/python-course/lessons/<урок>.py:
  content/python-course/<папка>/theory.md, tasks.json (ожидаемый вывод тестов получается запуском эталонного решения)
  и scripts/python-course/solutions/<id>.py.

Описание урока: DIR (папка в content/python-course), THEORY (Markdown), TASKS — список словарей
{id, title, statement, solution, inputs: [[строки ввода] или {"input": [...], "files": {имя: текст}}, …],
 open (сколько первых тестов открыто, по умолчанию 2), forbid, require, modules (учебные модули из shims/)}.
Решение не должно печатать подсказки в input(). Запуск — как в check.py (временная папка, файлы теста, модули).

Запуск: python3 scripts/python-course/build.py [урок …]   (без аргументов — все уроки)
"""

import json
import os
import runpy
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check import run as run_solution  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LESSONS = os.path.join(ROOT, 'scripts', 'python-course', 'lessons')
SOLUTIONS = os.path.join(ROOT, 'scripts', 'python-course', 'solutions')
CONTENT = os.path.join(ROOT, 'content', 'python-course')


def run(code, lines, files, modules):
    try:
        return run_solution(code, lines, files, modules)
    except Exception as e:  # noqa: BLE001
        raise SystemExit(f'решение упало на вводе {lines!r}: {type(e).__name__}: {e}')


def build(name):
    spec = runpy.run_path(os.path.join(LESSONS, name + '.py'))
    folder = os.path.join(CONTENT, spec['DIR'])
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'theory.md'), 'w') as f:
        f.write(spec['THEORY'].strip() + '\n')
    tasks = []
    for t in spec['TASKS']:
        solution = t['solution'].strip('\n') + '\n'
        with open(os.path.join(SOLUTIONS, t['id'] + '.py'), 'w') as f:
            f.write(solution)
        tests = []
        for item in t['inputs']:
            lines, files = (item, None) if isinstance(item, list) else (item.get('input', []), item.get('files'))
            test = {'input': lines, 'output': run(solution, lines, files, t.get('modules', [])).rstrip('\n')}
            if files:
                test['files'] = files
            tests.append(test)
        task = {'id': t['id'], 'title': t['title'], 'statement': t['statement'].strip(), 'openTests': t.get('open', 2), 'tests': tests}
        if t.get('forbid'):
            task['forbid'] = t['forbid']
        if t.get('require'):
            task['require'] = t['require']
        if t.get('modules'):
            task['modules'] = t['modules']
        tasks.append(task)
    with open(os.path.join(folder, 'tasks.json'), 'w') as f:
        f.write(json.dumps(tasks, ensure_ascii=False, indent=2) + '\n')
    print(f'{spec["DIR"]}: задач {len(tasks)}, тестов {sum(len(t["tests"]) for t in tasks)}')


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(n[:-3] for n in os.listdir(LESSONS) if n.endswith('.py'))
    for n in names:
        build(n)

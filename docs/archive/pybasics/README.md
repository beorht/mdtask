# «Python'da oddiy dasturlash» — курс убран с сайта

26.10.2026 по просьбе преподавателя курс «Простое программирование на Python» (`/subjects/pybasics`, группа PRAK
и TEST, узбекский язык) убран с сайта. Здесь сохранено всё, чтобы при необходимости вернуть его.

| Файл / папка | Что это |
| --- | --- |
| `content/` | 5 заданий: `tasks.json` (тесты: ввод и ожидаемый вывод, `openTests`), `NN-<id>/theory.md` и `task.md` |
| `scripts/` | эталонные решения `solutions/*.py` и `check.py` (проверка решения на тестах) |
| `python-basics.js`, `route-python-basics.js` | бывшие `src/lib/python-basics.js` и `src/routes/python-basics.js` |
| `client-python-basics.js` | бывший `public/js/python-basics.js` (редактор, запуск в Pyodide, «Tekshirish») |
| `views/` | шаблоны страниц студента и админки (`/admin/python-basics`) |
| `*.test.js.txt` | тесты курса (расширение изменено, чтобы `npm test` их не запускал) |

Что осталось на сайте: `src/lib/python-basics-check.js` (сравнение вывода, им пользуются итоговая контрольная IB и
детектор №8), `public/js/python-worker.js` (запуск Python в браузере). Таблицы `python_basics_progress` и
`python_basics_attempts` в базе не удалены — в них результаты студентов PRAK.

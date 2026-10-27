# 4. Модель данных

## Задание (src/data/exercises.json, src/data/containers.json)

```jsonc
{
  "id": "practice-01",              // уникальный; practice-NN — банк Emmet, containers-NN — контейнеры
  "title": "Подпись к фото",        // заголовок в тетради и в панели
  "description": "Условие…",        // описывает задачу, а не ответ: без тегов и без сокращения
  "emmetExpression": "p.caption{Фото дня}", // ЭТАЛОН. Студенту не показывается
  "mode": "emmet",                  // "emmet" — только через Emmet; "html" — можно руками
  "validationMode": "structure",    // только в банке Emmet; сейчас единственный режим
  "section": "containers",          // только в containers.json; у банка добавляется сервером как "emmet"
  "difficulty": 1                   // 1 — лёгкая, 2 — средняя, 3 — сложная
  // "expectedHtml": "…"            // необязательно; по умолчанию = expand(emmetExpression)
}
```

Правила:

- `expectedHtml` вычисляется развёртыванием `emmetExpression` тем же пакетом `emmet` с отступом в 2 пробела. Поэтому эталон всегда соответствует сокращению.
- Пустое значение атрибута в эталоне (`href=""`) означает «атрибут нужен, значение любое».
- В банке Emmet должно быть не меньше работ каждого уровня, чем требует `PLAN` (3 / 2 / 5). Иначе `createAssignment` выбросит ошибку.

### Шаг-теория (только на клиенте)

```js
{ id: 'containers-lesson', kind: 'lesson', title: 'Теория: id, class и контейнеры' }
```

Сервер о нём не знает. Клиент вставляет его в план перед первым заданием с `section: 'containers'`.

## Файлы сервера (`server/data/`, не в git)

### roster.txt — список группы

По одному ФИО в строке, пробелы схлопываются. Это вход для `npm run keys`.

### accounts.json — аккаунты (создаёт `npm run keys`)

```json
{
  "admin": { "key": "ADM-XXXX-XXXX" },
  "students": [
    { "id": "s01", "name": "Фамилия Имя", "key": "stWeb-123" }
  ]
}
```

- `id` — `s` и порядковый номер с ведущим нулём (`s01`…). Не меняется.
- Ключ студента — `stWeb-###`, три случайные цифры. Ключ преподавателя — `ADM-` и две группы по 4 символа из алфавита `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (без 0/O, 1/I/L).
- Скрипт можно запускать повторно: выданные ключи сохраняются, новые ФИО из roster добавляются, ключи старого формата перевыпускаются.
- Попутно создаются `keys.csv` (BOM, `;`, CRLF — для Excel) и `keys.md` (с ключом преподавателя, **не для студентов**).

### session.json — состояние занятия

```json
{ "closedAt": null }
```

`closedAt` — ISO-время завершения или `null`. Записывается сразу при изменении.

### stats.json — статистика

```jsonc
{
  "s01": {
    "firstSeen": "2026-10-23T08:01:12.000Z",
    "lastSeen":  "2026-10-23T09:40:03.000Z",
    "assignment": ["practice-02", "…"],  // 10 id из банка Emmet (без контейнеров!)
    "exercises": {
      "practice-02": {
        "openedAt": "ISO", "lastAt": "ISO",
        "attempts": 3,                    // все проверки
        "success": 1, "partial": 1, "error": 0, "mismatch": 1, // по статусам
        "handwritten": 0,                 // проверок с HTML, набранным вручную
        "pastes": 0,                      // заблокированных вставок, перетаскиваний и кусков текста
        "aways": 1, "awayMs": 41000,      // уходы со страницы: количество и сумма
        "lastAwayMs": 41000, "lastReturnAt": "ISO",
        "solvedAfterAway": true,          // принято ≤ 2 мин после возвращения из ухода ≥ 15 с
        "solvedAt": "ISO",                // первое принятое решение
        "attemptsToSolve": 3,             // номер первой принятой попытки
        "lastStatus": "success",
        "lastCode": "…",                  // код последней попытки
        "solvedCode": "…"                 // код первого принятого решения
      }
    }
  }
}
```

- Полный план студента = `assignment` (из stats) + все id из `containers.json` (общие, в stats не хранятся).
- Набор пересоздаётся, если он не проходит `isValidAssignment` (банк изменился, не тот размер, другие уровни).
- После решения повторные проверки увеличивают `attempts`, но не меняют `solvedAt`, `attemptsToSolve` и `solvedCode`.
- Запись в файл откладывается на 300 мс (debounce) и атомарна (`.tmp` → `rename`).

## Хранилище в браузере

| Ключ | Где | Что |
| --- | --- | --- |
| `emmet.studentKey` | localStorage | Ключ студента до «Выйти» |
| `emmet.adminKey` | localStorage | Ключ преподавателя |
| `emmet.loginMessage` | sessionStorage | Сообщение для экрана входа после выхода |
| `emmet.adminMessage` | sessionStorage | То же для панели |

## Производные данные панели (`src/admin/stats.js`)

| Функция | Результат |
| --- | --- |
| `cellState(item, assigned)` | `unassigned \| none \| opened \| tried \| solved` |
| `flagsOf(item)` | Признаки списывания: HTML вручную, вставки, «решено сразу после ухода» |
| `summarize(student, exercises)` | `total, solved, attempts, handwritten, pastes, violations (=handwritten+pastes), aways, awayMs, suspicious, avgToSolve` |
| `taskTotals(exercise, students)` | `assigned, solved, tried, avgToSolve` по работе |
| `isOnline(student)` | `lastSeen` моложе 5 мин (в панели ещё и `false`, если занятие завершено) |
| `toCsv(students, exercises)` | CSV: BOM, разделитель `;`, CRLF; итоговые колонки + колонка на каждую работу |

> В сводке панели «Нарушения» = HTML вручную + вставки + **уходы**. В колонке матрицы «Наруш.» и в
> `summarize().violations` уходов нет: уходы показаны отдельно в колонке «Вне стр.».

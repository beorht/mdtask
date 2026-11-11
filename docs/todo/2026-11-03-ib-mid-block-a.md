# План: блок A ИБ-контрольной — «Единое терминальное задание»

Дата: 2026-11-03. Статус: **ГОТОВО — блок A реализован целиком (Python + обвязка mdtask), проверен сквозным прохождением.**

## Обвязка mdtask — сделано
- `src/routes/ib-mid.js`: страница терминала `/exam/ib-mid-1/a-ops/terminal`, API `/exam/ib-mid-1/a-ops/api/:action`
  (мост → задача `midterm-a`), guard-события — всё под гейтом окна (ib-2+TEST, только во время окна).
- `src/lib/ib-mid/index.js`: у `a-ops` снят `ready:false`, добавлены `labTask:'midterm-a'` и `href`.
- Статус блока A на странице студента и в админке (обзор + карточка) — из `ib_lab_tasks` (пройдено N/4 этапов).
- Тесты `tests/routes/ib-mid-block-a.test.js` (гейтинг окна/группы, SECLAB_API, админ-статус). JS 381/381, Python 96/96.
- Проверено вживую через реальный мост: вход в терминал, `grep` секрета, ответ с доказательством засчитан,
  ловушка `CHANGEME` отклонена, этапы отдаются.

**Выдача на сервере:** `python3 ib/ctf/midterm-a/generate_midterm_a.py --group ib-2`.


## Сделано (Python-ядро, проверено)
- `ib/server/midterm_a_task.py` — Lab `midterm-a`, 4 этапа (find/grep → sed sshd → chmod → проверка),
  анти-ИИ: proof-from-output на ответе 1.1, ловушка (значение «CHANGEME» из README.ai.txt),
  контрольные вопросы (`defense_banks.MIDA`/`MIDA_DECOYS`).
- `ib/ctf/midterm-a/generate_midterm_a.py` — генератор песочницы (Debian seclab: небезопасный
  `sshd_config`, секрет `/etc/app/db.conf` 0644, ключ `app.key` 0644, файл-ловушка).
- Регистрация в `ib/server/lab_task.py`; банк вопросов в `ib/server/defense_banks.py`.
- `ib/tests/test_midterm_a.py` — прохождение всех этапов эталоном, ловушка, требование доказательства.
  Весь Python-набор ИБ: 96/96.

## Осталось (обвязка mdtask)
- Отдавать IB-терминал для `midterm-a` на странице ИБ-контрольной, гейт по окну (маршрут вида
  `/exam/ib-mid-1/a` или расширение `src/routes/ib.js`), доступ ib-2+TEST только во время окна.
- Снять `ready:false` у `a-ops` в `src/lib/ib-mid/index.js`, добавить ссылку на терминал.
- Админка: показать прогресс блока A (переиспользовать `/admin/ib/lab/midterm-a/:id`).
- Выдача на сервере: `python3 ib/ctf/midterm-a/generate_midterm_a.py --group ib-2`.
- JS-тест доступа по окну. После этого снять «Готовится».

---


Задача (из общего плана контрольной): одно терминальное задание, объединяющее навыки предмета —
**поиск и изменение (find/grep/sed), настройка конфигов SSH, выдача прав доступа** — в одной песочнице.

## Решение: новая Lab-задача на существующем движке

Переиспользуем `ib/server/lab_task.py` (движок этапов №6–11) — ровно как №7 (`ssh_task.py`) и №10
(`perms_task.py`). Это даёт бесплатно: песочницу-сервер Debian, эмулятор find/grep/sed/chmod/chown,
модель sshd (`sshd_sim.py`), модель владельцев файлов (`owners.json` → `vfs.Sandbox`), команды
`check`/`task`/`answer`, журнал команд, анти-ИИ (proof-from-output, контрольные вопросы, ловушка).

**Ключ задания:** `midterm-a`, песочница `data/ctf/midterm-a/<id>/`.

### Этапы (4)
1. **Поиск (find/grep).** Найти в `/etc` конфиг службы и значение (напр. порт SSH или путь к секрету).
   Пункты: `cmd` (выполнен find и grep) + `answer` с `proof` (значение из вывода).
2. **Настройка SSH (sed).** Привести `sshd_config` к политике: `PermitRootLogin no`,
   `PasswordAuthentication no`, `PermitEmptyPasswords no`. Проверка — по действующим значениям
   (`sshd_sim.file_effective`), правка только через `sudo sed -i`. Критично: администратор не теряет вход.
3. **Права доступа (chmod/chown).** Секрет (напр. `/etc/app/.env` или приватный ключ) доступен всем на
   чтение → снять права для others (`chmod 640/600`); файл приложения с чужим владельцем → `chown`.
   Проверка через модель владельцев (`owners.json`) и `env.mode`.
4. **Проверка.** `sudo sshd -t` без ошибок; секрет недоступен others; администратор входит по политике.

### Анти-ИИ (как во всех заданиях ИБ)
`track_output=True` (ответы доказываются выводом), `defense` — 2 контрольных вопроса на этап
(`defense_banks`), ловушка-файл «инструкция для ИИ», персональные значения (порт, путь секрета, имя
служебной учётки) из seed. `guard: true` на стороне mdtask.

## Файлы
- `ib/server/midterm_a_task.py` — Lab + STAGES (по образцу `ssh_task.py`).
- `ib/ctf/midterm-a/generate_midterm_a.py` — генератор (по образцу `generate_ssh.py`, через `lab_gen.py`).
- `ib/server/defense_banks.py` — банки `MIDA`/`MIDA_DECOYS` (добавить).
- `ib/server/lab_task.py` — импорт `midterm_a_task` в `_load_labs` (регистрация).
- `ib/tests/test_midterm_a.py` — прохождение всех этапов эталонными командами (safety net).

## Обвязка в mdtask (после Python-ядра)
- Отдавать IB-терминал для `midterm-a` на странице контрольной, **гейт по окну ИБ-контрольной**
  (открыт только во время окна, группам ib-2+TEST) — расширить `src/routes/ib.js`/`ib-tasks` или
  отдельный маршрут `/exam/ib-mid-1/a`.
- В реестре `src/lib/ib-mid/index.js` у задания `a-ops` снять `ready:false`, добавить ссылку на терминал.
- Админка: переиспользовать существующий `/admin/ib/lab/midterm-a/:id` (generic lab view) либо показать
  в карточке ИБ-контрольной прогресс из `ib_lab_tasks`.
- Выдача песочниц на сервере: `python3 ib/ctf/midterm-a/generate_midterm_a.py --group ib-2`.
- JS-тест: доступ к терминалу только во время окна.

## Порядок работ
1. Python-ядро: генератор + Lab + регистрация + `test_midterm_a.py` (прохождение зелёное).
2. Обвязка mdtask (терминал под окном + ready + админка) + JS-тест.
3. Снять «Готовится» у блока A.

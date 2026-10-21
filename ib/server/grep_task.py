"""
Задание №9 «Тренажёр grep» (grep) — 13 задач, в каждой студент пишет команду grep, которая даёт нужный вывод.

Устроено на движке lab_task.py: задача = этап, открываются по порядку. Ответ — не значение, а сама
команда: после каждой команды grep (Lab.on_command) она проверяется так:
  1. в строке только grep (несколько grep через | можно), без перенаправлений, $(...), ; && ||;
  2. её вывод на учебном сервере студента совпадает с выводом эталонной команды
     (<mdtask>/scripts/ib/solutions/grep.json) — строка в строку;
  3. в команде не набран сам ответ (строка вывода целиком в командной строке);
  4. та же команда выполняется на двух скрытых проверочных наборах (data/ctf/grep-check/<id>/1, /2:
     те же пути, другое содержимое) и тоже совпадает с эталоном.
Тогда задача решена (progress["answers"]["gK"]), и задаются 2 контрольных вопроса (defense.py): первый —
«мутационный»: система меняет команду студента (убирает -w, ^, \\b …), выполняет изменённую и спрашивает,
сколько строк она выведет; второй — по смыслу частей шаблона. Неверный или просроченный ответ — половина
баллов задачи. progress["grep"]["K"]: число попыток, время открытия и решения, вопрос-мутация.
"""

import json
import posixpath
import random
import re
import shlex
from pathlib import Path

import defense as defense_mod
import lab_task
import shell
from vfs import Sandbox

CHECK_DIR = "grep-check"          # data/ctf/grep-check/<id>/<n>/ — скрытые наборы, рядом с песочницами
HIDDEN_SETS = (1, 2)
SOLUTIONS = Path(__file__).resolve().parents[2] / "scripts" / "ib" / "solutions" / "grep.json"
ALLOWED = {"grep", "egrep", "fgrep"}
POINTS = [3, 3, 4] + [9] * 10     # 100
PATH_TASKS = {7}                  # вывод — имена файлов: пути приводятся к одному виду
MUTABLE_FLAGS = "iwxvoF"
TYPED_MIN = 7                     # строка вывода такой длины, набранная в команде, — «набран ответ»

THEMES = {
    "shop": {"title": "интернет-магазин", "service": "shopd", "domain_base": "savdo"},
    "library": {"title": "электронная библиотека", "service": "libcat", "domain_base": "kutubxona"},
    "clinic": {"title": "поликлиника", "service": "medrec", "domain_base": "shifo"},
}

_REFS = None


def refs():
    global _REFS
    if _REFS is None:
        data = json.loads(SOLUTIONS.read_text(encoding="utf-8"))
        _REFS = {int(k): v for k, v in data.items() if k.isdigit()}
    return _REFS


def subst(cmd, p):
    return (cmd.replace("<emp>", p["emp"]).replace("<svc>", p["svc"])
            .replace("<domain_re>", p["domain"].replace(".", "\\.")))


def reference(k, p):
    return subst(refs()[k]["ref"], p)


# ============================================================ выполнение ===

def run_in(root, student_id, cwd, line):
    """Выполняет строку в песочнице root (только чтение) из каталога cwd. -> (вывод, код)."""
    root = Path(root)
    if not (root / cwd).is_dir():
        (root / cwd).mkdir(parents=True, exist_ok=True)   # свой каталог студента есть только на сервере
    sb = Sandbox(root, student_id, f"home/{student_id}", mapped_home=False, writable=False)
    ctx = shell.Ctx({"cwd": cwd, "student_id": student_id, "last_status": 0}, sb, {})
    out = shell.run(ctx, line)
    return out, ctx.status


def hidden_roots(root, student_id):
    base = Path(root).resolve().parent.parent / CHECK_DIR / student_id
    return [base / str(n) for n in HIDDEN_SETS]


def normalize(k, out, cwd):
    lines = out.split("\n") if out else []
    if k in PATH_TASKS:
        lines = [posixpath.normpath(posixpath.join("/" + cwd, x)) for x in lines]
    return lines


def expectations(root, student_id, p):
    """Контрольные точки условия: число строк эталонного вывода и первая строка (на данных студента)."""
    out = {}
    home = f"home/{student_id}"
    for k in sorted(refs()):
        text, _ = run_in(root, student_id, home, reference(k, p))
        lines = normalize(k, text, home)
        out[str(k)] = {"count": len(lines), "first": lines[0] if lines else ""}
    return out


# =============================================================== разбор ===

def grep_pipeline(line):
    """-> (список Word-команд, None) или (None, причина отказа), или (None, None) — это не команда grep."""
    try:
        lists = shell.parse(line)
    except shell.ShellSyntaxError:
        return None, None
    if not lists:
        return None, None
    names = []
    for pipeline, _ in lists:
        for cmd in pipeline:
            first = cmd["words"][0] if cmd["words"] else None
            names.append("".join(t for kind, t, _ in first.parts if kind == "lit") if first else "")
    if not any(n in ALLOWED for n in names):
        return None, None
    if len(lists) != 1:
        return None, "одна команда в строке: без ; && ||"
    pipeline = lists[0][0]
    bad = [n for n in names if n not in ALLOWED]
    if bad:
        return None, f"разрешён только grep (несколько grep через | можно), а в строке есть: {', '.join(sorted(set(bad)))}"
    for cmd in pipeline:
        if cmd["redirs"]:
            return None, "без перенаправлений < > 2>"
        for w in cmd["words"]:
            if any(kind == "cmd" for kind, _, _ in w.parts):
                return None, "без подстановки $(...)"
    return pipeline, None


def argv_of(pipeline, ctx):
    def no_subst(_):
        raise shell.ShellSyntaxError("подстановка запрещена")
    return [[a for w in cmd["words"] for a in shell.expand_word(ctx, w, no_subst)] for cmd in pipeline]


def line_of(argvs):
    return " | ".join(" ".join(shlex.quote(a) for a in argv) for argv in argvs)


# ============================================================== мутации ===

def mutations(argvs):
    """Изменённые варианты команды: (подпись «если …», argvs)."""
    out = []
    seen = set()

    def add(label, ci, ai, new):
        variant = [list(a) for a in argvs]
        if new is None:
            del variant[ci][ai]
        else:
            variant[ci][ai] = new
        key = line_of(variant)
        if key not in seen:
            seen.add(key)
            out.append((label, variant))

    for ci, argv in enumerate(argvs):
        skip_next = False
        for ai, a in enumerate(argv[1:], 1):
            if skip_next:
                skip_next = False
                if argv[ai - 1] in ("-e", "--regexp"):
                    _pattern_mut(a, ci, ai, add)
                continue
            if a.startswith("--"):
                if a == "--no-group-separator":
                    add("убрать --no-group-separator", ci, ai, None)
                elif a.startswith("--include"):
                    add(f"убрать {a}", ci, ai, None)
                elif a in ("--regexp", "--file", "--max-count", "--after-context", "--before-context", "--context"):
                    skip_next = True
                continue
            if a.startswith("-") and len(a) > 1:
                letters = []
                for j, c in enumerate(a[1:], 1):
                    if c in "efmABCdD":
                        if j == len(a) - 1:
                            skip_next = True
                        break
                    letters.append(c)
                for c in dict.fromkeys(letters):
                    if c in MUTABLE_FLAGS:
                        rest = a.replace(c, "", 1)
                        add(f"убрать ключ -{c}", ci, ai, rest if rest != "-" else None)
                continue
            _pattern_mut(a, ci, ai, add)
    return out


def _pattern_mut(a, ci, ai, add):
    if a.startswith("^") and len(a) > 1:
        add("убрать ^ в начале шаблона", ci, ai, a[1:])
    if a.endswith("$") and not a.endswith("\\$") and len(a) > 1:
        add("убрать $ в конце шаблона", ci, ai, a[:-1])
    if "\\." in a:
        add("в шаблоне заменить \\. на .", ci, ai, a.replace("\\.", "."))
    if "\\b" in a:
        add("убрать \\b из шаблона", ci, ai, a.replace("\\b", ""))
    if "(?!" in a or "(?<!" in a:
        add("убрать из шаблона проверки (?<!…) и (?!…)", ci, ai, re.sub(r"\(\?<?!(?:[^()]|\([^()]*\))*\)", "", a))


def mutation_question(root, student_id, cwd, argvs, original, rng, counting):
    """Вопрос «сколько строк выведет ваша команда, если …» с ответом, посчитанным здесь же."""
    variants = []
    for label, variant in mutations(argvs):
        text, status = run_in(root, student_id, cwd, line_of(variant))
        if status >= 2:
            continue
        lines = text.split("\n") if text else []
        value = (lines[0] if lines else "0") if counting else str(len(lines))
        if lines != original:
            variants.append((label, value))
    if not variants:
        return None
    label, answer = rng.choice(variants)
    base = (original[0] if original else "0") if counting else str(len(original))
    options = [answer]
    for v in [base] + [v for _, v in variants]:
        if v not in options:
            options.append(v)
    n = int(answer) if answer.isdigit() else 0
    step = 1
    while len(options) < 4:
        for cand in (n + step, n - step):
            if cand >= 0 and str(cand) not in options and len(options) < 4:
                options.append(str(cand))
        step += 1
    word = "Какое число выведет" if counting else "Сколько строк выведет"
    return {"label": label, "answer": answer, "options": options[:4],
            "text": f"{word} ваша команда, если {label}?"}


# ============================================================== проверка ===

def on_command(state, line, ctx, output):
    """После каждой команды: если это grep — проверить её как решение текущей задачи."""
    progress = state.progress
    k = progress["done"] + 1
    if k > LAB.total or defense_mod.pending(progress)[1] is not None:
        return []
    key = f"g{k}"
    if progress["answers"].get(key, {}).get("ok"):
        return []
    pipeline, why = grep_pipeline(line)
    if pipeline is None and why is None:
        return []
    info = progress.setdefault("grep", {}).setdefault(str(k), {"tries": 0})
    info.setdefault("opened_at", _opened_at(progress, k))
    info["tries"] += 1
    if why:
        info["refused"] = info.get("refused", 0) + 1
        return [f"[Задача {k}] не засчитано: {why}."]
    p = state.params
    sid = state.student_id
    cwd = ctx.cwd
    ref = reference(k, p)
    mine, status = run_in(state.root, sid, cwd, line)
    expected, _ = run_in(state.root, sid, f"home/{sid}", ref)
    got, want = normalize(k, mine, cwd), normalize(k, expected, f"home/{sid}")
    if got != want:
        return [f"[Задача {k}] вывод не совпадает: {_diff(got, want)}"]
    typed = [x for x in got if len(x) >= TYPED_MIN and x in line]
    if typed:
        info["typed"] = info.get("typed", 0) + 1
        return [f"[Задача {k}] не засчитано: в команде набран сам результат («{typed[0][:60]}»). "
                "Нужна команда, которая находит такие строки, а не перечисляет их."]
    for n, hroot in enumerate(hidden_roots(state.root, sid), 1):
        h_mine, _ = run_in(hroot, sid, cwd, line)
        h_want, _ = run_in(hroot, sid, f"home/{sid}", ref)
        if normalize(k, h_mine, cwd) != normalize(k, h_want, f"home/{sid}"):
            info["hidden_fail"] = info.get("hidden_fail", 0) + 1
            got_n, want_n = len(normalize(k, h_mine, cwd)), len(normalize(k, h_want, f"home/{sid}"))
            return [f"[Задача {k}] на ваших данных вывод верный, а на проверочном наборе {n} — нет "
                    f"(строк: {got_n}, нужно {want_n}). Команда должна работать на любых данных такого вида, "
                    "а не только на ваших строках: перечитайте условие задачи."]
    now = lab_task.NOW()
    info.update({"solved_at": now, "seconds": round(now - info["opened_at"], 1) if info.get("opened_at") else None,
                 "cmd": line[:500]})
    try:
        argvs = argv_of(pipeline, ctx)
        rng = random.Random(f"{p.get('seed')}-{k}-{now}")
        counting = any(re.fullmatch(r"-[A-Za-z]*c[A-Za-z]*", a) or a == "--count" for a in argvs[-1])
        info["mut"] = mutation_question(state.root, sid, cwd, argvs, got, rng, counting)
    except Exception:  # noqa: BLE001 — без вопроса-мутации задача всё равно засчитывается
        info["mut"] = None
    progress["answers"][key] = {"value": line[:500], "ok": True, "at": lab_task.now_iso(), "tries": info["tries"]}
    return [f"[Задача {k}] ✔ Команда верна: вывод совпал на ваших данных и на двух проверочных наборах."]


def _opened_at(progress, k):
    prev = (progress.get("grep") or {}).get(str(k - 1)) or {}
    return prev.get("solved_at") or lab_task.NOW()


def _diff(got, want):
    if len(got) != len(want):
        head = f"строк {len(got)}, нужно {len(want)}"
    else:
        head = "столько же строк, но не те"
    extra = next((x for x in got if x not in want), None)
    missing = next((x for x in want if x not in got), None)
    if extra is not None:
        return f"{head}; лишняя строка: «{extra[:100]}»."
    if missing is not None:
        return f"{head}; не хватает строки: «{missing[:100]}»."
    return f"{head}; порядок или повторы строк другие."


# ============================================================ подсказки ===

HINTS = {
    1: "разделы «Ключи -i и -w» и «Где кончается слово»",
    2: "раздел «Подсчёт: -c»",
    3: "разделы «Классы символов» и «Якоря ^ и $», а также «Инверсия: -v»",
    4: "разделы «Квантификаторы», «Группы и альтернатива» и «Просмотр вперёд и назад (-P)»",
    5: "разделы «Формат access.log» и «Квантификаторы»",
    6: "разделы «Поля через двоеточие» и «Конвейер из grep»",
    7: "разделы «Рекурсивный поиск: -r, -l, --include» и «Классы символов»",
    8: "раздел «Контекст: -A, -B, -C»",
    9: "разделы «Почтовые адреса» и «Просмотр вперёд и назад (-P)»",
    10: "раздел «Обратные ссылки»",
    11: "разделы «Якоря ^ и $» и «Диапазоны в квадратных скобках»",
    12: "раздел «Шаблоны из файла: -f и -F»",
    13: "разделы «Обратные ссылки» и «Просмотр вперёд и назад (-P)»",
}


def cmd_hint(state, args):
    k = state.progress["done"] + 1
    if k > LAB.total:
        return "Все задачи решены.", True
    hints = state.progress.setdefault("hints", {})
    hints[str(k)] = hints.get(str(k), 0) + 1
    return (f"Задача {k}: прочитайте в теории {HINTS[k]} (страница «Теория» задания). "
            "Готовой команды подсказка не даёт; обращение к подсказке записывается."), True


# ======================================================= контрольные вопросы ===

BANK = {
    1: [("Что делает ключ -w?", ["совпадение засчитывается, только если это отдельное слово",
                                 "ищет слово в начале строки", "выводит только найденное слово", "игнорирует регистр"]),
        ("Почему без -w в вывод попадут лишние строки?", ["шаблон найдётся и внутри более длинных имён",
                                                          "grep выведет строки дважды", "без -w grep ищет по словам",
                                                          "лишних строк не будет"])],
    2: [("Что выводит grep -c?", ["число строк, в которых есть совпадение", "число всех совпадений в файле",
                                  "номера найденных строк", "число слов в файле"]),
        ("Почему «failed password» с маленькой буквы не входит в ответ?", ["grep без -i различает регистр",
                                                                           "grep -c не считает такие строки",
                                                                           "эти строки в другом файле",
                                                                           "это ошибка журнала"])],
    3: [("Что означает [[:space:]]* в начале шаблона?", ["любое число пробелов и табуляций, в том числе ноль",
                                                         "ровно один пробел", "любой символ", "конец строки"]),
        ("Почему строку «url = …/#/login» нельзя выкидывать?", ["# стоит не в начале строки — это не комментарий",
                                                                "в ней нет знака #", "её выкидывать надо",
                                                                "grep не видит такие строки"])],
    4: [("Зачем в шаблоне адреса пишут \\. вместо .?", ["точка без \\ означает «любой символ»",
                                                        "так быстрее", "без \\ точку не видно в выводе",
                                                        "это обязательно только в -P"]),
        ("Почему 300.1.2.3 — не адрес IPv4?", ["каждое число в адресе — от 0 до 255", "в адресе не бывает 3",
                                               "адрес должен начинаться с 10", "в адресе нет точек"])],
    5: [("Почему недостаточно искать « 5[0-9][0-9] »?", ["такое же число может быть размером ответа или частью адреса",
                                                         "grep не понимает [0-9]", "коды 5xx пишутся без пробелов",
                                                         "так найдутся только 500"]),
        ("Что стоит в access.log сразу после закрывающей кавычки запроса?", ["пробел и код ответа",
                                                                             "размер ответа", "адрес клиента",
                                                                             "время запроса"])],
    6: [("Какое поле /etc/passwd хранит UID?", ["третье", "второе", "четвёртое", "последнее"]),
        ("Почему нельзя просто выкинуть строки со словом nologin?", ["слово может стоять в поле комментария, а оболочка — /bin/bash",
                                                                     "nologin бывает только у root",
                                                                     "grep -v не работает с /etc/passwd",
                                                                     "можно, это верно"])],
    7: [("Что делает ключ -l?", ["выводит только имена файлов с совпадениями", "выводит номера строк",
                                 "ищет только в ссылках", "выводит длину строк"]),
        ("Зачем --include='*.conf'?", ["чтобы искать только в файлах .conf, без .bak и .example",
                                       "чтобы найти и подкаталоги", "чтобы игнорировать регистр",
                                       "без него -r не работает"])],
    8: [("Что делает -B2?", ["выводит 2 строки перед каждой найденной", "выводит 2 строки после",
                             "ищет не больше 2 совпадений", "выводит каждую 2-ю строку"]),
        ("Что выводит grep между группами контекста без --no-group-separator?", ["строку --",
                                                                                 "пустую строку", "номер группы",
                                                                                 "ничего"])],
    9: [("Почему адрес x@<домен>.secure-login.com не подходит?", ["домен на самом деле secure-login.com — это подделка",
                                                                  "в нём есть дефис", "адрес слишком длинный",
                                                                  "подходит, это наш домен"]),
        ("Что делает (?!…) в шаблоне -P?", ["проверяет, что дальше НЕ идёт указанное, не захватывая его",
                                            "захватывает группу", "выводит текст после совпадения",
                                            "делает шаблон нечувствительным к регистру"])],
    10: [("Что означает \\1 в шаблоне?", ["тот же текст, что совпал с первой группой в скобках",
                                         "любую одну букву", "первый символ строки", "цифру 1"]),
         ("Почему «дом домой» — не повтор?", ["после второго «дом» слово продолжается — нужна граница слова",
                                             "слова разного регистра", "между словами два пробела",
                                             "это повтор"])],
    11: [("Зачем ^ в начале шаблона даты?", ["дата должна быть в начале строки — дата внутри сообщения не считается",
                                             "чтобы найти строки с конца", "это ускоряет поиск", "^ означает «не»"]),
         ("Что совпадает с 2[1-3]?", ["21, 22 и 23", "2, 1, 2 и 3", "от 2 до 23", "21 и 23"])],
    12: [("Что делает -f ФАЙЛ?", ["берёт шаблоны из файла, по одному в строке", "ищет имена файлов",
                                  "выводит только имена файлов", "читает файл вместо stdin"]),
         ("Зачем -F при поиске адресов из списка?", ["точка в адресе должна быть просто точкой, а не «любым символом»",
                                                     "чтобы искать быстрее в больших файлах",
                                                     "без -F grep не читает файл шаблонов",
                                                     "чтобы выводить только адреса"])],
    13: [("Как в шаблоне потребовать одинаковый разделитель между группами цифр?", ["запомнить первый разделитель группой и повторять через \\1",
                                                                                    "написать [ -] четыре раза",
                                                                                    "ключом -w", "это сделать нельзя"]),
         ("Зачем (?<!\\d) перед номером?", ["чтобы номер не был хвостом более длинного числа",
                                            "чтобы номер начинался с цифры", "чтобы найти номер в начале строки",
                                            "это не нужно"])],
}


def defense(k, env, params, progress):
    rng = defense_mod.rng_for(params, k, "grep")
    info = (progress.get("grep") or {}).get(str(k)) or {}
    first = None
    mut = info.get("mut")
    if mut:
        first = defense_mod.question(rng, mut["text"], mut["options"])
    return defense_mod.from_bank(BANK, k, params, 2, first)


def score(progress, params):
    done = progress.get("done", 0)
    stages, total = [], 0.0
    for k, stage in enumerate(STAGES, 1):
        full = POINTS[k - 1]
        pts, state = 0.0, "нет"
        if k <= done:
            pts = full
            d = (progress.get("defense") or {}).get(str(k))
            if d and d.get("results"):
                ok = all(r["ok"] for r in d["results"])
                state = "да" if ok else "частично"
                if not ok:
                    pts = full / 2
        total += pts
        info = (progress.get("grep") or {}).get(str(k)) or {}
        stages.append({"k": k, "title": stage["title"], "points": round(pts, 1), "max": full, "defense": state,
                       "tries": info.get("tries", 0), "seconds": info.get("seconds")})
    return {"total": round(total, 1), "max": sum(POINTS), "stages": stages}


# ================================================================ условие ===

ITEM = ("Напишите команду grep, которая выводит ровно это. Проверка — сразу после команды: "
        "на ваших данных и на двух проверочных наборах.")


def _stage(title, goal, lines, point=True):
    intro = list(lines)
    return {"title": title, "goal": goal, "intro": intro, "point": point,
            "items": [{"text": ITEM, "kind": "fs"}]}


STAGES = [
    _stage("Строки своей учётной записи",
           "вывести все строки журнала /var/log/auth.log, где упоминается учётная запись {emp}.",
           ["Учётная запись {emp} должна стоять отдельным словом; регистр не важен ({emp_upper} — та же запись).",
            "Записи вида {emp}5, {emp}a, {emp}_old — другие учётные записи, их строки не нужны."]),
    _stage("Подсчёт неудачных входов",
           "вывести одно число — сколько строк /var/log/auth.log содержат «Failed password» "
           "(именно так: с заглавной F).",
           ["Строки, где эти слова написаны иначе (например, «failed password change»), не считаются."],
           point=False),
    _stage("Конфигурация без комментариев",
           "вывести /etc/{svc}/{svc}.conf без комментариев и пустых строк.",
           ["Комментарий — строка, которая начинается с #, в том числе после пробелов или табуляции.",
            "Пустая строка — и совсем пустая, и состоящая только из пробелов и табуляций.",
            "Строки, где # стоит после значения (например, в адресе https://…/#/login), остаются."]),
    _stage("IPv4-адреса из заметок",
           "вывести из /srv/{svc}/notes.txt только сами адреса IPv4, каждый на своей строке, по порядку.",
           ["Адрес — четыре числа от 0 до 255 через точку, без ведущих нулей (192.168.010.1 — не адрес).",
            "Адрес не часть более длинной записи: перед ним нет буквы, цифры, _ или точки, после — нет буквы, "
            "цифры, _ и нет точки с цифрой (v2.10.3.1 и 1.2.3.4.5 — не адреса).",
            "Точка в конце предложения после адреса — не часть адреса."]),
    _stage("Ошибки сервера в access.log",
           "вывести строки /var/log/nginx/access.log, где код ответа — от 500 до 599.",
           ["Код ответа стоит сразу после закрывающей кавычки запроса: «\"GET /x HTTP/1.1\" 503 1234».",
            "Число 5xx в адресе страницы или в размере ответа — не код ответа.",
            "Запросы бывают и HTTP/1.1, и HTTP/2.0."]),
    _stage("Пользователи с входом в систему",
           "вывести из /etc/passwd только имена (первое поле) пользователей с UID от 1000 и оболочкой входа.",
           ["UID — третье поле, GID — четвёртое; нужен именно UID ≥ 1000.",
            "Оболочка — последнее поле; /usr/sbin/nologin и /bin/false — не оболочки входа.",
            "Слово nologin в поле комментария не делает оболочку nologin."]),
    _stage("Файлы с паролями",
           "вывести имена всех файлов *.conf в /etc/{svc} и его подкаталогах, где задан непустой пароль.",
           ["Пароль задан, если строка начинается (можно после пробелов или табуляции) с ключа password, "
            "затем =, а после него есть хотя бы один непробельный символ.",
            "Закомментированные строки, пустое значение и другие ключи (db_password, password_hint) не считаются.",
            "Файлы .bak, .example и README не нужны. Вывод — только пути файлов, как их печатает grep."]),
    _stage("Входы root с контекстом",
           "вывести каждый успешный вход root из /var/log/auth.log и по 2 строки перед ним.",
           ["Успешный вход — «Accepted password for root …» или «Accepted publickey for root …».",
            "rootadmin — другая учётная запись. Неудачные попытки входа root не нужны.",
            "Между группами строк не должно быть разделителя «--»."]),
    _stage("Почта организации",
           "вывести из /srv/{svc}/contacts.txt только адреса почты домена {domain}, каждый на своей строке.",
           ["Регистр не важен. Имя до @ — буквы, цифры и символы . _ % + -.",
            "Не подходят: поддомены (x@branch.{domain}) и адреса, где домен продолжается "
            "({domain}.secure-login.com, {domain}bek.com).",
            "Точка в конце предложения и угловые скобки вокруг адреса — не часть адреса."]),
    _stage("Повторённые слова",
           "вывести строки /srv/{svc}/notes.txt, где одно и то же слово стоит два раза подряд через пробел.",
           ["Регистр не важен: «Нет нет» — повтор.",
            "Слово — буквы (русские или латинские); «дом домой» и «ab abc» — не повтор."]),
    _stage("Записи за вечер 18 ноября",
           "вывести записи /var/log/{svc}/app.log с 2026-11-18 21:00:00 до 2026-11-18 23:59:59 включительно.",
           ["Дата и время записи — в начале строки.",
            "Дата внутри текста сообщения (например, «report scheduled for …») не считается."]),
    _stage("Адреса из чёрного списка",
           "вывести строки /var/log/nginx/access.log, где встречается адрес из /srv/{svc}/blocklist.txt.",
           ["Адреса берите из файла списка, не набирайте их в команде.",
            "Адрес должен совпасть целиком: 10.0.0.1 — не 10.0.0.15. Точка в адресе — просто точка."]),
    _stage("Номера карт",
           "вывести из /srv/{svc}/payments.txt только номера карт, каждый на своей строке.",
           ["Номер — 16 цифр: подряд или четыре группы по 4 цифры с одним и тем же разделителем "
            "(пробел или -) между всеми группами.",
            "Не номера: часть более длинного числа (20-значный номер заказа) и запись с разными разделителями."]),
]

for _k, _s in enumerate(STAGES, 1):
    _s["items"][0]["check"] = (lambda env, key=f"g{_k}": bool(env.answers.get(key, {}).get("ok")))
    if _s["point"]:
        _s["intro"].append("Контрольная точка на ваших данных: строк — {e%d_count}, первая: {e%d_first}" % (_k, _k))
    else:
        _s["intro"].append("Вывод — одна строка с числом.")
    _s["intro"].append("Разрешён только grep (несколько grep через | можно). Подсказка — hint.")

INTRO = [
    "Тренажёр из 13 задач. Учебный сервер: {theme_title}, служба {svc}. В каждой задаче нужно написать "
    "одну команду grep, которая выводит ровно то, что сказано в условии.",
    "",
    "Правила:",
    "",
    "- разрешён только grep (egrep, fgrep); несколько grep через | можно, а cat, sort, head, awk, sed, "
    "перенаправления, $(...), ; && || — нет;",
    "- команда проверяется сразу после выполнения: на ваших данных и на двух скрытых проверочных наборах — "
    "те же файлы, другое содержимое. Команда, подогнанная под ваши строки, не пройдёт;",
    "- после каждой задачи — 2 контрольных вопроса по вашей команде, 60 секунд на каждый: answer q НОМЕР;",
    "- hint — какой раздел теории прочитать (обращение к подсказке записывается);",
    "- нейросети и чужая помощь запрещены, вставка в терминал отключена.",
]


class GrepLab(lab_task.Lab):
    def item_text(self, item, params, student_id):
        return item["text"].format(**_fmt(params), user=student_id)

    def stage_text(self, k, params, student_id, results=None, done=0):
        return super().stage_text(k, _fmt(params), student_id, results, done)

    def task_markdown(self, params, student_id):
        f = _fmt(params)
        lines = [f"# Задание №{self.number}. {self.title}", ""]
        lines += [x.format(**f, user=student_id) for x in self.intro]
        lines += ["", "Команды: `task` — текущая задача, `task 5` — задача 5, `check` — прогресс, `hint` — подсказка, "
                  "`help` — все команды, `man grep` — справка.", ""]
        for k, stage in enumerate(self.stages, 1):
            lines += [f"## Задача {k}. {stage['title']}", "", f"**Нужно:** {stage['goal'].format(**f, user=student_id)}", ""]
            lines += [f"- {x.format(**f, user=student_id)}" for x in stage["intro"]]
            lines.append("")
        return "\n".join(lines)


def _fmt(params):
    th = THEMES.get(params.get("theme", "shop"), THEMES["shop"])
    out = {**params, "theme_title": th["title"], "emp_upper": params.get("emp", "").upper()}
    for k, e in (params.get("expect") or {}).items():
        out[f"e{k}_count"] = e.get("count", 0)
        out[f"e{k}_first"] = f"«{e.get('first', '')}»" if e.get("first") else "—"
    for k in range(1, len(STAGES) + 1):
        out.setdefault(f"e{k}_count", "?")
        out.setdefault(f"e{k}_first", "—")
    return out


LAB = lab_task.register(GrepLab("grep", 9, "Тренажёр grep", STAGES, INTRO, "grep"))
LAB.defense = defense
LAB.score = score
LAB.on_command = on_command
LAB.commands = {"hint": cmd_hint}
LAB.help_line = ("Команды задания: task — текущая задача, check — прогресс, hint — подсказка, cat TASK.md — все задачи. "
                 "Ответ — сама команда grep: она проверяется сразу после выполнения.")

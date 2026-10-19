#!/usr/bin/env python3
"""
Индивидуальное задание «Учёт библиотеки: анализ выдачи книг (SQLite + Python)».

Для каждого студента генерирует:
  - текст задания (Markdown) с его личными данными в таблицах — без кода: всю программу,
    включая создание и заполнение базы, студент пишет сам;
  - эталонные значения для преподавателя.

    python3 scripts/library-analysis/generate.py --statement ID     # текст задания в stdout
    python3 scripts/library-analysis/generate.py --expected ID      # эталон в stdout
    python3 scripts/library-analysis/generate.py --out DIR ID...    # эталоны в DIR/<ID>.md

В данных у каждого студента заложены ошибки: даты другого формата, возврат раньше выдачи,
читатель, записанный дважды (другой регистр и пробел в конце).
"""

import argparse
import datetime as dt
import os
import random
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = dt.date(2026, 10, 15)
LOAN_DAYS = 14

BOOKS = [
    ("Мастер и Маргарита", "М. Булгаков", "Роман", 1967), ("Преступление и наказание", "Ф. Достоевский", "Роман", 1866),
    ("Война и мир", "Л. Толстой", "Роман", 1869), ("Минувшие дни", "Абдулла Кадыри", "Роман", 1926),
    ("Шум", "Абдулла Каххар", "Рассказы", 1950), ("Маленький принц", "А. де Сент-Экзюпери", "Сказка", 1943),
    ("Гарри Поттер и философский камень", "Дж. Роулинг", "Фэнтези", 1997), ("Хоббит", "Дж. Толкин", "Фэнтези", 1937),
    ("1984", "Дж. Оруэлл", "Антиутопия", 1949), ("451° по Фаренгейту", "Р. Брэдбери", "Антиутопия", 1953),
    ("Python. Карманный справочник", "М. Лутц", "Учебная", 2015), ("Грокаем алгоритмы", "А. Бхаргава", "Учебная", 2016),
    ("Чистый код", "Р. Мартин", "Учебная", 2008), ("Изучаем SQL", "А. Болье", "Учебная", 2009),
    ("Шерлок Холмс. Рассказы", "А. Конан Дойл", "Детектив", 1892), ("Убийство в Восточном экспрессе", "А. Кристи", "Детектив", 1934),
]
FIRST = ["Азиз", "Нигора", "Рустам", "Дилноза", "Шахзод", "Малика", "Бобур", "Камола", "Отабек", "Севара",
         "Жасур", "Зарина", "Санжар", "Лола", "Тимур", "Мадина"]
FEMALE = {"Нигора", "Дилноза", "Малика", "Камола", "Севара", "Зарина", "Лола", "Мадина"}
LAST = ["Каримов", "Юсупов", "Рахимов", "Ахмедов", "Назаров", "Хасанов", "Алиев", "Султанов"]
GROUPS = ["IB-22", "WEB-21", "DS-23"]


def generate(student_id):
    rnd = random.Random("library-analysis:" + student_id)
    books = [dict(id=i + 1, title=t, author=a, genre=g, year=y) for i, (t, a, g, y) in enumerate(rnd.sample(BOOKS, 10))]

    names = set()
    while len(names) < 9:
        first, last = rnd.choice(FIRST), rnd.choice(LAST)
        names.add(f"{last}{'а' if first in FEMALE else ''} {first}")
    names = sorted(names)  # порядок множества зависит от запуска — сначала сортируем
    rnd.shuffle(names)
    readers = [dict(id=i + 1, name=n, group=rnd.choice(GROUPS)) for i, n in enumerate(names)]
    original = readers[rnd.randrange(0, 5)]
    duplicate = dict(id=10, name=original["name"].lower() + " ", group=original["group"])
    readers.append(duplicate)
    idle = {readers[7]["id"], readers[8]["id"]}  # эти двое ничего не брали

    popularity = [rnd.uniform(0.3, 3.0) for _ in books]
    active = [r for r in readers if r["id"] not in idle and r["id"] != 10]
    activity = [rnd.uniform(0.5, 2.5) for _ in active]
    loans = []
    start = dt.date(2026, 9, 1)
    for i in range(28):
        issued = start + dt.timedelta(days=rnd.randint(0, 43))
        book = rnd.choices(books, weights=popularity)[0]
        reader = rnd.choices(active, weights=activity)[0]
        keep = rnd.randint(3, 20)
        returned = issued + dt.timedelta(days=keep)
        loans.append(dict(book_id=book["id"], reader_id=reader["id"], issued=issued, returned=returned if returned <= TODAY - dt.timedelta(days=1) and rnd.random() < 0.8 else None))
    loans.sort(key=lambda l: l["issued"])
    for i, l in enumerate(loans):
        l["id"] = i + 1
    # дубликат читателя брал книги «под другим именем»
    for l in rnd.sample(loans, 2):
        l["reader_id"] = 10
    # ошибка ввода: дата возврата раньше даты выдачи
    bad = rnd.choice([l for l in loans if l["returned"]])
    bad["returned"] = bad["issued"] - dt.timedelta(days=rnd.randint(2, 6))
    bad_id = bad["id"]
    # даты в другом формате
    other_format = set(l["id"] for l in rnd.sample([l for l in loans if l["id"] != bad_id], 3))
    return dict(books=books, readers=readers, loans=loans, bad_id=bad_id, other_format=other_format,
                duplicate=(10, original["id"]), idle=idle)


def fmt_date(d, other):
    if d is None:
        return ""
    return d.strftime("%d.%m.%Y") if other else d.isoformat()


def data_markdown(data):
    out = ["### Книги — `books`", "", "| id | Название | Автор | Жанр | Год |", "|---:|---|---|---|---:|"]
    out += [f"| {b['id']} | {b['title']} | {b['author']} | {b['genre']} | {b['year']} |" for b in data["books"]]
    out += ["", "### Читатели — `readers`", "", "| id | ФИО | Группа |", "|---:|---|---|"]
    out += [f"| {r['id']} | {r['name']} | {r['group']} |" for r in data["readers"]]
    out += ["", "### Выдачи — `loans`", "", "Пустая дата возврата — книга ещё у читателя.", "",
            "| id | id книги | id читателя | Дата выдачи | Дата возврата |", "|---:|---:|---:|---|---|"]
    for l in data["loans"]:
        other = l["id"] in data["other_format"]
        out.append(f"| {l['id']} | {l['book_id']} | {l['reader_id']} | {fmt_date(l['issued'], other)} | {fmt_date(l['returned'], other)} |")
    return "\n".join(out)


def statement(student_id):
    with open(os.path.join(HERE, "statement.md"), encoding="utf-8") as f:
        text = f.read()
    return text.replace("{{DATA}}", data_markdown(generate(student_id)))


def expected(student_id):
    d = generate(student_id)
    books = {b["id"]: b for b in d["books"]}
    readers = {r["id"]: r for r in d["readers"]}
    merged = lambda rid: d["duplicate"][1] if rid == d["duplicate"][0] else rid
    valid = [l for l in d["loans"] if l["id"] != d["bad_id"]]

    per_book = {}
    for l in d["loans"]:
        per_book[l["book_id"]] = per_book.get(l["book_id"], 0) + 1
    top = sorted(per_book.items(), key=lambda kv: (-kv[1], kv[0]))
    genres = {}
    for l in d["loans"]:
        g = books[l["book_id"]]["genre"]
        genres[g] = genres.get(g, 0) + 1
    months = {}
    for l in d["loans"]:
        m = l["issued"].strftime("%Y-%m")
        months[m] = months.get(m, 0) + 1
    days = [(l["returned"] - l["issued"]).days for l in valid if l["returned"]]
    overdue = [(l, (TODAY - l["issued"]).days - LOAN_DAYS) for l in d["loans"] if l["returned"] is None and (TODAY - l["issued"]).days > LOAN_DAYS]
    per_reader = {}
    for l in d["loans"]:
        per_reader[merged(l["reader_id"])] = per_reader.get(merged(l["reader_id"]), 0) + 1
    best = max(per_reader.items(), key=lambda kv: (kv[1], -kv[0]))
    raw_iso_months = {}
    for l in d["loans"]:
        key = fmt_date(l["issued"], l["id"] in d["other_format"])[:7]
        raw_iso_months[key] = raw_iso_months.get(key, 0) + 1
    bad = next(l for l in d["loans"] if l["id"] == d["bad_id"])
    n = len(d["loans"])

    lines = [f"# Эталон: учёт библиотеки — {student_id}", "",
             f"Строк: книг {len(d['books'])}, читателей {len(d['readers'])}, выдач {n}. «Сегодня» = {TODAY.isoformat()}, срок {LOAN_DAYS} дней.", "",
             "## Ошибки в данных", "",
             f"- Даты ДД.ММ.ГГГГ: выдачи {', '.join(map(str, sorted(d['other_format'])))}.",
             f"- Возврат раньше выдачи: выдача {bad['id']} ({bad['issued']} → {bad['returned']}).",
             f"- Дубликат читателя: id 10 «{readers[10]['name']}» = id {d['duplicate'][1]} «{readers[d['duplicate'][1]]['name']}».", "",
             "## Выдачи", "",
             "- По книгам (все 28 выдач): " + "; ".join(f"{books[b]['title']} — {c}" for b, c in top),
             "- Топ-3: " + ", ".join(f"{books[b]['title']} ({c})" for b, c in top[:3]) + " (при равенстве — любой порядок)",
             "- По жанрам: " + "; ".join(f"{g} — {c} ({round(c / n * 100, 1)} %)" for g, c in sorted(genres.items(), key=lambda kv: -kv[1])),
             "- По месяцам (после приведения дат): " + "; ".join(f"{m} — {c}" for m, c in sorted(months.items())),
             "- Группировка по первым 7 символам даты без приведения: " + "; ".join(f"`{m}` — {c}" for m, c in sorted(raw_iso_months.items())), "",
             "## Обработка", "",
             f"- Средний срок на руках (возвращённые, без ошибочной выдачи): {round(statistics.mean(days), 1)} дн., медиана {statistics.median(days)} дн., возвращено {len(days)}.",
             f"- На руках сейчас: {sum(1 for l in d['loans'] if l['returned'] is None)} книг.",
             "- Просрочены: " + ("; ".join(f"выдача {l['id']}: «{books[l['book_id']]['title']}», читатель {readers[merged(l['reader_id'])]['name']}, просрочка {late} дн." for l, late in overdue) or "нет"),
             f"- Самый активный читатель (с учётом дубликата): {readers[best[0]]['name']} — {best[1]} выдач.",
             "- Не брали книг: " + ", ".join(readers[i]["name"] for i in sorted(d["idle"])), ""]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--statement", metavar="ID")
    ap.add_argument("--expected", metavar="ID")
    ap.add_argument("--out", help="каталог для эталонов <ID>.md")
    ap.add_argument("students", nargs="*")
    args = ap.parse_args()
    if args.statement:
        print(statement(args.statement))
    elif args.expected:
        print(expected(args.expected))
    elif args.out and args.students:
        os.makedirs(args.out, exist_ok=True)
        for s in args.students:
            path = os.path.join(args.out, f"{s}.md")
            with open(path, "w", encoding="utf-8") as f:
                f.write(expected(s))
            print("записано:", path)
    else:
        ap.error("укажите --statement ID, --expected ID или --out DIR ID...")


if __name__ == "__main__":
    sys.exit(main())

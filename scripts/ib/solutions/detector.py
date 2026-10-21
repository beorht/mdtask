# Эталон этапа 7 задания ИБ №8 (детектор атак). Студентам не показывается: тест
# tests/lib/ib-detector.test.js проверяет, что он даёт тот же вывод, что эталон сайта
# (src/lib/ib-detector.js) — значит, условие задачи однозначно.
import re

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
LINE = re.compile(r'^(\S+) \S+ \S+ \[(\d{2})/(\w{3})/(\d{4}):(\d{2}):(\d{2}):(\d{2}) [+-]\d{4}\] '
                  r'"(\S+) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "[^"]*" "([^"]*)" rt=')


def seconds(day, month, year, h, m, s):
    days = [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    total = sum(days[:month]) + day - 1
    return ((total * 24 + h) * 60 + m) * 60 + s


def main():
    n = int(input())
    brute, scan = {}, {}
    for _ in range(n):
        line = input()
        if " rt=" not in line:
            continue
        m = LINE.match(line)
        if not m:
            continue
        xff = m.group(11).strip()
        client = xff.split(",")[-1].strip() if xff and xff != "-" else m.group(1)
        t = seconds(int(m.group(2)), MONTHS.index(m.group(3)), int(m.group(4)),
                    int(m.group(5)), int(m.group(6)), int(m.group(7)))
        path = m.group(9).split("?")[0]
        status = int(m.group(10))
        if m.group(8) == "POST" and path == "/login" and status == 401:
            brute.setdefault(client, []).append(t)
        if status == 404:
            scan.setdefault(client, set()).add(path)
    found = []
    for ip, times in brute.items():
        times_sorted = sorted(times)
        if any(times_sorted[i + 4] - times_sorted[i] <= 60 for i in range(len(times_sorted) - 4)):
            found.append((ip, 0, f"BRUTEFORCE {ip} {len(times)}"))
    for ip, paths in scan.items():
        if len(paths) >= 8:
            found.append((ip, 1, f"SCAN {ip} {len(paths)}"))
    found.sort(key=lambda f: ([int(x) for x in f[0].split(".")], f[1]))
    if not found:
        print("Атак не найдено")
    for _, _, text in found:
        print(text)


main()

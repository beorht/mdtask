import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE accounts (name TEXT, money INTEGER)")
for _ in range(int(input())):
    name, money = input().split()
    conn.execute("INSERT INTO accounts VALUES (?, ?)", (name, int(money)))
conn.commit()
while True:
    line = input()
    if line == "стоп":
        break
    a, b, s = line.split()
    try:
        with conn:
            conn.execute("UPDATE accounts SET money = money - ? WHERE name = ?", (int(s), a))
            if conn.execute("SELECT money FROM accounts WHERE name = ?", (a,)).fetchone()[0] < 0:
                raise ValueError("мало денег")
            conn.execute("UPDATE accounts SET money = money + ? WHERE name = ?", (int(s), b))
    except ValueError:
        print(f"Отказ: {a} -> {b}")
for name, money in conn.execute("SELECT name, money FROM accounts ORDER BY name"):
    print(f"{name}: {money}")

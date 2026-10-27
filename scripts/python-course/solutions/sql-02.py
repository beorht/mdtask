import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (name TEXT, price INTEGER)")
for _ in range(int(input())):
    name, price = input().split()
    conn.execute("INSERT INTO products VALUES (?, ?)", (name, int(price)))
limit = int(input())
for name, price in conn.execute("SELECT name, price FROM products WHERE price <= ? ORDER BY price, name", (limit,)):
    print(name, price)
print("Найдено:", conn.execute("SELECT COUNT(*) FROM products WHERE price <= ?", (limit,)).fetchone()[0])

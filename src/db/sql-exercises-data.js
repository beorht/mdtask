// Auto-generated practice data for the SQL trainer. See docs/plan.md for the feature design.
module.exports = [
  {
    "id": "create_table-1",
    "orderIndex": 1,
    "topic": "create_table",
    "title": "Создание таблицы products",
    "descriptionMd": "Создайте таблицу `products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(products)",
    "orderMatters": false,
    "expectedResult": [
      {
        "cid": 0,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "name",
        "type": "TEXT",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "price",
        "type": "REAL",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "create_table-2",
    "orderIndex": 2,
    "topic": "create_table",
    "title": "Создание таблицы customers",
    "descriptionMd": "Создайте таблицу `customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(customers)",
    "orderMatters": false,
    "expectedResult": [
      {
        "cid": 0,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "name",
        "type": "TEXT",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "email",
        "type": "TEXT",
        "notnull": 0,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "create_table-3",
    "orderIndex": 3,
    "topic": "create_table",
    "title": "Создание таблицы categories",
    "descriptionMd": "Создайте таблицу `categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(categories)",
    "orderMatters": false,
    "expectedResult": [
      {
        "cid": 0,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "name",
        "type": "TEXT",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "create_table-4",
    "orderIndex": 4,
    "topic": "create_table",
    "title": "Создание таблицы orders",
    "descriptionMd": "Создайте таблицу `orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(orders)",
    "orderMatters": false,
    "expectedResult": [
      {
        "cid": 0,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "customer_id",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "product_id",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 3,
        "name": "quantity",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "create_table-5",
    "orderIndex": 5,
    "topic": "create_table",
    "title": "Создание таблицы employees",
    "descriptionMd": "Создайте таблицу `employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, position TEXT NOT NULL, salary REAL NOT NULL)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(employees)",
    "orderMatters": false,
    "expectedResult": [
      {
        "cid": 0,
        "name": "id",
        "type": "INTEGER",
        "notnull": 0,
        "dflt_value": null,
        "pk": 1
      },
      {
        "cid": 1,
        "name": "name",
        "type": "TEXT",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "position",
        "type": "TEXT",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 3,
        "name": "salary",
        "type": "REAL",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "insert-6",
    "orderIndex": 6,
    "topic": "insert",
    "title": "Добавление одной записи",
    "descriptionMd": "В таблицу `products (id, name, category, price, quantity)` добавьте товар: id=1, name='Ноутбук', category='Электроника', price=55000, quantity=10.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      }
    ]
  },
  {
    "id": "insert-7",
    "orderIndex": 7,
    "topic": "insert",
    "title": "Добавление записи со значением по умолчанию",
    "descriptionMd": "Добавьте товар id=2, name='Мышь', category='Электроника', price=1200, не указывая quantity явно (используется значение по умолчанию 0).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 0
      }
    ]
  },
  {
    "id": "insert-8",
    "orderIndex": 8,
    "topic": "insert",
    "title": "Добавление нескольких записей одним запросом",
    "descriptionMd": "Одним запросом INSERT добавьте два товара: (3, 'Стол', 'Мебель', 8000, 5) и (4, 'Стул', 'Мебель', 3000, 20).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      }
    ]
  },
  {
    "id": "insert-9",
    "orderIndex": 9,
    "topic": "insert",
    "title": "Вставка с явным порядком колонок",
    "descriptionMd": "Добавьте товар id=5, name='Книга', category='Книги', price=500, quantity=100, указав список колонок в порядке (id, price, quantity, category, name).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      }
    ]
  },
  {
    "id": "insert-10",
    "orderIndex": 10,
    "topic": "insert",
    "title": "Массовая вставка нескольких записей",
    "descriptionMd": "Одним запросом добавьте три товара: (6, 'Ручка', 'Канцтовары', 50, 200), (7, 'Карандаш', 'Канцтовары', 30, 300), (8, 'Тетрадь', 'Канцтовары', 40, 150).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      },
      {
        "id": 7,
        "name": "Карандаш",
        "category": "Канцтовары",
        "price": 30,
        "quantity": 300
      },
      {
        "id": 8,
        "name": "Тетрадь",
        "category": "Канцтовары",
        "price": 40,
        "quantity": 150
      }
    ]
  },
  {
    "id": "select-11",
    "orderIndex": 11,
    "topic": "select",
    "title": "Выбор всех данных",
    "descriptionMd": "Выберите все столбцы и все строки из таблицы `products`.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "select-12",
    "orderIndex": 12,
    "topic": "select",
    "title": "Выбор конкретных столбцов",
    "descriptionMd": "Выберите только столбцы `name` и `price` из таблицы `products`.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "name": "Ноутбук",
        "price": 55000
      },
      {
        "name": "Мышь",
        "price": 1200
      },
      {
        "name": "Стол",
        "price": 8000
      },
      {
        "name": "Стул",
        "price": 3000
      },
      {
        "name": "Книга",
        "price": 500
      },
      {
        "name": "Ручка",
        "price": 50
      }
    ]
  },
  {
    "id": "select-13",
    "orderIndex": 13,
    "topic": "select",
    "title": "Псевдонимы столбцов",
    "descriptionMd": "Выберите `name` и `price`, назвав их в результате `product_name` и `product_price` (используйте AS).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "product_name": "Ноутбук",
        "product_price": 55000
      },
      {
        "product_name": "Мышь",
        "product_price": 1200
      },
      {
        "product_name": "Стол",
        "product_price": 8000
      },
      {
        "product_name": "Стул",
        "product_price": 3000
      },
      {
        "product_name": "Книга",
        "product_price": 500
      },
      {
        "product_name": "Ручка",
        "product_price": 50
      }
    ]
  },
  {
    "id": "select-14",
    "orderIndex": 14,
    "topic": "select",
    "title": "Сортировка результата",
    "descriptionMd": "Выберите все товары, отсортировав их по цене (`price`) по возрастанию.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": true,
    "expectedResult": [
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      }
    ]
  },
  {
    "id": "select-15",
    "orderIndex": 15,
    "topic": "select",
    "title": "Сортировка с ограничением количества строк",
    "descriptionMd": "Выберите 3 самых дорогих товара (столбцы id, name, price), отсортировав по убыванию цены.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": true,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "price": 55000
      },
      {
        "id": 3,
        "name": "Стол",
        "price": 8000
      },
      {
        "id": 4,
        "name": "Стул",
        "price": 3000
      }
    ]
  },
  {
    "id": "where-16",
    "orderIndex": 16,
    "topic": "where",
    "title": "Фильтр по точному совпадению",
    "descriptionMd": "Выберите все товары категории 'Электроника' (все столбцы).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      }
    ]
  },
  {
    "id": "where-17",
    "orderIndex": 17,
    "topic": "where",
    "title": "Фильтр по числовому условию",
    "descriptionMd": "Выберите все товары с ценой больше 3000 (все столбцы).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      }
    ]
  },
  {
    "id": "where-18",
    "orderIndex": 18,
    "topic": "where",
    "title": "Комбинация условий через AND",
    "descriptionMd": "Выберите товары категории 'Мебель' с ценой меньше 5000 (все столбцы).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      }
    ]
  },
  {
    "id": "where-19",
    "orderIndex": 19,
    "topic": "where",
    "title": "Комбинация условий через OR",
    "descriptionMd": "Выберите товары категории 'Книги' или 'Канцтовары' (все столбцы).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "where-20",
    "orderIndex": 20,
    "topic": "where",
    "title": "Фильтр по шаблону LIKE",
    "descriptionMd": "Выберите товары, название которых начинается на букву 'С' (используйте LIKE), все столбцы.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      }
    ]
  },
  {
    "id": "update-21",
    "orderIndex": 21,
    "topic": "update",
    "title": "Обновление одного значения",
    "descriptionMd": "Измените цену товара с id=1 ('Ноутбук') на 60000.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "UPDATE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 60000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "update-22",
    "orderIndex": 22,
    "topic": "update",
    "title": "Обновление количества",
    "descriptionMd": "Измените quantity товара с id=6 ('Ручка') на 150.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "UPDATE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 150
      }
    ]
  },
  {
    "id": "update-23",
    "orderIndex": 23,
    "topic": "update",
    "title": "Обновление по условию для нескольких строк",
    "descriptionMd": "Установите price = 2500 для всех товаров категории 'Мебель'.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "UPDATE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 2500,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 2500,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "update-24",
    "orderIndex": 24,
    "topic": "update",
    "title": "Изменение текстового значения",
    "descriptionMd": "Измените category товара 'Ручка' с 'Канцтовары' на 'Офис'.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "UPDATE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Офис",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "update-25",
    "orderIndex": 25,
    "topic": "update",
    "title": "Обновление по числовому условию",
    "descriptionMd": "Обнулите quantity (установите 0) у всех товаров, где quantity больше 100.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "UPDATE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 0
      }
    ]
  },
  {
    "id": "delete-26",
    "orderIndex": 26,
    "topic": "delete",
    "title": "Удаление одной записи",
    "descriptionMd": "Удалите товар с id=6 ('Ручка').",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      }
    ]
  },
  {
    "id": "delete-27",
    "orderIndex": 27,
    "topic": "delete",
    "title": "Удаление по категории",
    "descriptionMd": "Удалите все товары категории 'Мебель'.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 6,
        "name": "Ручка",
        "category": "Канцтовары",
        "price": 50,
        "quantity": 200
      }
    ]
  },
  {
    "id": "delete-28",
    "orderIndex": 28,
    "topic": "delete",
    "title": "Удаление по числовому условию",
    "descriptionMd": "Удалите все товары с ценой меньше 100.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      },
      {
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      }
    ]
  },
  {
    "id": "delete-29",
    "orderIndex": 29,
    "topic": "delete",
    "title": "Удаление по условию количества",
    "descriptionMd": "Удалите все товары, у которых quantity больше или равно 100.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 1,
        "name": "Ноутбук",
        "category": "Электроника",
        "price": 55000,
        "quantity": 10
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Стол",
        "category": "Мебель",
        "price": 8000,
        "quantity": 5
      },
      {
        "id": 4,
        "name": "Стул",
        "category": "Мебель",
        "price": 3000,
        "quantity": 20
      }
    ]
  },
  {
    "id": "delete-30",
    "orderIndex": 30,
    "topic": "delete",
    "title": "Полная очистка таблицы",
    "descriptionMd": "Удалите все строки из таблицы `products`, сохранив саму таблицу.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-31",
    "orderIndex": 31,
    "topic": "drop",
    "title": "Удаление таблицы products",
    "descriptionMd": "Удалите таблицу `products` целиком.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='products'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-32",
    "orderIndex": 32,
    "topic": "drop",
    "title": "Удаление временной таблицы",
    "descriptionMd": "Удалите таблицу `temp_logs` целиком.",
    "schemaSql": "CREATE TABLE temp_logs (id INTEGER PRIMARY KEY, message TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='temp_logs'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-33",
    "orderIndex": 33,
    "topic": "drop",
    "title": "Удаление устаревшей таблицы заказов",
    "descriptionMd": "Удалите таблицу `old_orders` целиком.",
    "schemaSql": "CREATE TABLE old_orders (id INTEGER PRIMARY KEY, total REAL);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='old_orders'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-34",
    "orderIndex": 34,
    "topic": "drop",
    "title": "Удаление резервной таблицы клиентов",
    "descriptionMd": "Удалите таблицу `backup_customers` целиком.",
    "schemaSql": "CREATE TABLE backup_customers (id INTEGER PRIMARY KEY, name TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='backup_customers'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-35",
    "orderIndex": 35,
    "topic": "drop",
    "title": "Удаление черновой таблицы категорий",
    "descriptionMd": "Удалите таблицу `draft_categories` целиком.",
    "schemaSql": "CREATE TABLE draft_categories (id INTEGER PRIMARY KEY, name TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='draft_categories'",
    "orderMatters": false,
    "expectedResult": []
  }
];

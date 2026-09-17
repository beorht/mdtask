// Auto-generated practice data for the SQL trainer. See docs/plan.md for the feature design.
module.exports = [
  {
    "id": "create_table-1",
    "orderIndex": 1,
    "topic": "create_table",
    "title": "Создание таблицы products",
    "descriptionMd": "Открываем интернет-магазин — начнём с каталога товаров. Создайте таблицу `products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)`.",
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
    "descriptionMd": "Чтобы принимать заказы, нужна база покупателей. Создайте таблицу `customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)`.",
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
    "descriptionMd": "Каталог станет удобнее, если разложить товары по категориям. Создайте таблицу `categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`.",
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
    "descriptionMd": "Покупатели готовы оформлять заказы — свяжем клиентов и товары. Создайте таблицу `orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL)`.",
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
    "descriptionMd": "Магазином управляет команда сотрудников — заведём их учёт. Создайте таблицу `employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, position TEXT NOT NULL, salary REAL NOT NULL)`.",
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
    "id": "create_table-36",
    "orderIndex": 6,
    "topic": "create_table",
    "title": "Создание таблицы reviews (отзывы о товарах)",
    "descriptionMd": "Каталог магазина растёт — пора собирать отзывы покупателей. Создайте таблицу `reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, rating INTEGER NOT NULL, comment TEXT)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(reviews)",
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
        "name": "product_id",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "rating",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 3,
        "name": "comment",
        "type": "TEXT",
        "notnull": 0,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "create_table-37",
    "orderIndex": 7,
    "topic": "create_table",
    "title": "Создание таблицы payments (оплаты заказов)",
    "descriptionMd": "Заказы нужно связать с оплатами. Создайте таблицу `payments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, amount REAL NOT NULL, paid_at TEXT)`.",
    "schemaSql": "",
    "allowedStatement": "CREATE TABLE",
    "checkType": "state_check",
    "checkerSql": "PRAGMA table_info(payments)",
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
        "name": "order_id",
        "type": "INTEGER",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 2,
        "name": "amount",
        "type": "REAL",
        "notnull": 1,
        "dflt_value": null,
        "pk": 0
      },
      {
        "cid": 3,
        "name": "paid_at",
        "type": "TEXT",
        "notnull": 0,
        "dflt_value": null,
        "pk": 0
      }
    ]
  },
  {
    "id": "insert-6",
    "orderIndex": 8,
    "topic": "insert",
    "title": "Добавление одной записи",
    "descriptionMd": "Магазин открылся — добавьте в products первый товар. В таблицу `products (id, name, category, price, quantity)` добавьте товар: id=1, name='Ноутбук', category='Электроника', price=55000, quantity=10.",
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
    "orderIndex": 9,
    "topic": "insert",
    "title": "Добавление записи со значением по умолчанию",
    "descriptionMd": "Ассортимент растёт — добавьте ещё один товар. Добавьте товар id=2, name='Мышь', category='Электроника', price=1200, не указывая quantity явно (используется значение по умолчанию 0).",
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
    "orderIndex": 10,
    "topic": "insert",
    "title": "Добавление нескольких записей одним запросом",
    "descriptionMd": "Пришла партия мебели — занесите её одним запросом. Одним запросом INSERT добавьте два товара: (3, 'Стол', 'Мебель', 8000, 5) и (4, 'Стул', 'Мебель', 3000, 20).",
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
    "orderIndex": 11,
    "topic": "insert",
    "title": "Вставка с явным порядком колонок",
    "descriptionMd": "На складе появилась новая книга. Добавьте товар id=5, name='Книга', category='Книги', price=500, quantity=100, указав список колонок в порядке (id, price, quantity, category, name).",
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
    "orderIndex": 12,
    "topic": "insert",
    "title": "Массовая вставка нескольких записей",
    "descriptionMd": "Пополнение канцтоварами — сразу несколько позиций. Одним запросом добавьте три товара: (6, 'Ручка', 'Канцтовары', 50, 200), (7, 'Карандаш', 'Канцтовары', 30, 300), (8, 'Тетрадь', 'Канцтовары', 40, 150).",
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
    "id": "insert-38",
    "orderIndex": 13,
    "topic": "insert",
    "title": "Пополнение ассортимента электроники",
    "descriptionMd": "Магазин продолжает пополнять склад. Добавьте новый товар: id=9, name='Флешка', category='Электроника', price=800, quantity=60.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 60
      }
    ]
  },
  {
    "id": "insert-39",
    "orderIndex": 14,
    "topic": "insert",
    "title": "Расширение каталога новой категорией",
    "descriptionMd": "Магазин открывает новое направление — одежду. Одним запросом добавьте два товара: (10, 'Футболка', 'Одежда', 1500, 40) и (11, 'Куртка', 'Одежда', 7000, 15).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL DEFAULT 0\n);\n",
    "allowedStatement": "INSERT",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      },
      {
        "id": 11,
        "name": "Куртка",
        "category": "Одежда",
        "price": 7000,
        "quantity": 15
      }
    ]
  },
  {
    "id": "select-11",
    "orderIndex": 15,
    "topic": "select",
    "title": "Выбор всех данных",
    "descriptionMd": "Посмотрим на витрину целиком. Выберите все столбцы и все строки из таблицы `products`.",
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
    "orderIndex": 16,
    "topic": "select",
    "title": "Выбор конкретных столбцов",
    "descriptionMd": "Для прайс-листа нужны только название и цена товара. Выберите только столбцы `name` и `price` из таблицы `products`.",
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
    "orderIndex": 17,
    "topic": "select",
    "title": "Псевдонимы столбцов",
    "descriptionMd": "Готовим отчёт для менеджера с понятными названиями колонок. Выберите `name` и `price`, назвав их в результате `product_name` и `product_price` (используйте AS).",
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
    "orderIndex": 18,
    "topic": "select",
    "title": "Сортировка результата",
    "descriptionMd": "Менеджеру нужен список товаров от дешёвых к дорогим. Выберите все товары, отсортировав их по цене (`price`) по возрастанию.",
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
    "orderIndex": 19,
    "topic": "select",
    "title": "Сортировка с ограничением количества строк",
    "descriptionMd": "Для главной страницы нужна подборка самых дорогих товаров. Выберите 3 самых дорогих товара (столбцы id, name, price), отсортировав по убыванию цены.",
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
    "id": "select-40",
    "orderIndex": 20,
    "topic": "select",
    "title": "Количество товаров в каталоге",
    "descriptionMd": "После всех пополнений каталог заметно вырос. Посчитайте общее количество товаров в таблице `products`, назвав результат `total` (используйте COUNT(*) и AS).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "total": 11
      }
    ]
  },
  {
    "id": "select-41",
    "orderIndex": 21,
    "topic": "select",
    "title": "Список уникальных категорий",
    "descriptionMd": "Выберите список уникальных категорий (без повторов) из таблицы `products`, используя DISTINCT.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
      {
        "category": "Электроника"
      },
      {
        "category": "Мебель"
      },
      {
        "category": "Книги"
      },
      {
        "category": "Канцтовары"
      },
      {
        "category": "Одежда"
      }
    ]
  },
  {
    "id": "where-16",
    "orderIndex": 22,
    "topic": "where",
    "title": "Фильтр по точному совпадению",
    "descriptionMd": "Покупатель интересуется только электроникой. Выберите все товары категории 'Электроника' (все столбцы).",
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
    "orderIndex": 23,
    "topic": "where",
    "title": "Фильтр по числовому условию",
    "descriptionMd": "Готовим подборку товаров подороже. Выберите все товары с ценой больше 3000 (все столбцы).",
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
    "orderIndex": 24,
    "topic": "where",
    "title": "Комбинация условий через AND",
    "descriptionMd": "Ищем недорогую мебель для акции. Выберите товары категории 'Мебель' с ценой меньше 5000 (все столбцы).",
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
    "orderIndex": 25,
    "topic": "where",
    "title": "Комбинация условий через OR",
    "descriptionMd": "Собираем подборку «Для учёбы». Выберите товары категории 'Книги' или 'Канцтовары' (все столбцы).",
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
    "orderIndex": 26,
    "topic": "where",
    "title": "Фильтр по шаблону LIKE",
    "descriptionMd": "Покупатель ищет товар по началу названия. Выберите товары, название которых начинается на букву 'С' (используйте LIKE), все столбцы.",
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
    "id": "where-42",
    "orderIndex": 27,
    "topic": "where",
    "title": "Диапазон цен",
    "descriptionMd": "Выберите все товары (все столбцы) с ценой от 500 до 5000 включительно (используйте BETWEEN или сравнения через AND).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
    "allowedStatement": "SELECT",
    "checkType": "select_match",
    "checkerSql": null,
    "orderMatters": false,
    "expectedResult": [
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
        "id": 5,
        "name": "Книга",
        "category": "Книги",
        "price": 500,
        "quantity": 100
      },
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 60
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      }
    ]
  },
  {
    "id": "where-43",
    "orderIndex": 28,
    "topic": "where",
    "title": "Товары не из категории 'Электроника'",
    "descriptionMd": "Выберите все товары (все столбцы), которые НЕ относятся к категории 'Электроника' (используйте <> или !=).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
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
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      },
      {
        "id": 11,
        "name": "Куртка",
        "category": "Одежда",
        "price": 7000,
        "quantity": 15
      }
    ]
  },
  {
    "id": "update-21",
    "orderIndex": 29,
    "topic": "update",
    "title": "Обновление одного значения",
    "descriptionMd": "Поставщик поднял закупочную цену на ноутбуки. Измените цену товара с id=1 ('Ноутбук') на 60000.",
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
    "orderIndex": 30,
    "topic": "update",
    "title": "Обновление количества",
    "descriptionMd": "Пришла новая партия ручек на склад. Измените quantity товара с id=6 ('Ручка') на 150.",
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
    "orderIndex": 31,
    "topic": "update",
    "title": "Обновление по условию для нескольких строк",
    "descriptionMd": "В магазине стартует сезонная распродажа мебели. Установите price = 2500 для всех товаров категории 'Мебель'.",
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
    "orderIndex": 32,
    "topic": "update",
    "title": "Изменение текстового значения",
    "descriptionMd": "Реорганизация каталога — часть канцтоваров переезжает в раздел «Офис». Измените category товара 'Ручка' с 'Канцтовары' на 'Офис'.",
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
    "orderIndex": 33,
    "topic": "update",
    "title": "Обновление по числовому условию",
    "descriptionMd": "После ревизии склада нужно скорректировать остатки. Обнулите quantity (установите 0) у всех товаров, где quantity больше 100.",
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
    "id": "update-44",
    "orderIndex": 34,
    "topic": "update",
    "title": "Пополнение склада электроники",
    "descriptionMd": "Прошла инвентаризация — добавьте 5 единиц к `quantity` всех товаров категории 'Электроника' (используйте `quantity = quantity + 5`).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
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
        "quantity": 15
      },
      {
        "id": 2,
        "name": "Мышь",
        "category": "Электроника",
        "price": 1200,
        "quantity": 55
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
      },
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 65
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      },
      {
        "id": 11,
        "name": "Куртка",
        "category": "Одежда",
        "price": 7000,
        "quantity": 15
      }
    ]
  },
  {
    "id": "update-45",
    "orderIndex": 35,
    "topic": "update",
    "title": "Снижение цены на канцтовары",
    "descriptionMd": "Канцтовары залежались на складе — снизьте `price` на 10 для всех товаров категории 'Канцтовары' (используйте `price = price - 10`).",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
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
        "price": 40,
        "quantity": 200
      },
      {
        "id": 7,
        "name": "Карандаш",
        "category": "Канцтовары",
        "price": 20,
        "quantity": 300
      },
      {
        "id": 8,
        "name": "Тетрадь",
        "category": "Канцтовары",
        "price": 30,
        "quantity": 150
      },
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 60
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      },
      {
        "id": 11,
        "name": "Куртка",
        "category": "Одежда",
        "price": 7000,
        "quantity": 15
      }
    ]
  },
  {
    "id": "delete-26",
    "orderIndex": 36,
    "topic": "delete",
    "title": "Удаление одной записи",
    "descriptionMd": "Ручку сняли с продажи. Удалите товар с id=6 ('Ручка').",
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
    "orderIndex": 37,
    "topic": "delete",
    "title": "Удаление по категории",
    "descriptionMd": "Мебельный отдел магазина закрывается. Удалите все товары категории 'Мебель'.",
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
    "orderIndex": 38,
    "topic": "delete",
    "title": "Удаление по числовому условию",
    "descriptionMd": "Чистим каталог от слишком дешёвых позиций. Удалите все товары с ценой меньше 100.",
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
    "orderIndex": 39,
    "topic": "delete",
    "title": "Удаление по условию количества",
    "descriptionMd": "Убираем из каталога залежавшийся неликвид. Удалите все товары, у которых quantity больше или равно 100.",
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
    "orderIndex": 40,
    "topic": "delete",
    "title": "Полная очистка таблицы",
    "descriptionMd": "Магазин уходит на полную переучёт склада. Удалите все строки из таблицы `products`, сохранив саму таблицу.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "delete-46",
    "orderIndex": 41,
    "topic": "delete",
    "title": "Списание невостребованного товара",
    "descriptionMd": "Удалите товары категории 'Одежда', у которых `quantity` меньше 20.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
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
      },
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
      },
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 60
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      }
    ]
  },
  {
    "id": "delete-47",
    "orderIndex": 42,
    "topic": "delete",
    "title": "Удаление премиум-товара",
    "descriptionMd": "Удалите все товары с ценой больше 10000.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200),\n  (7, 'Карандаш', 'Канцтовары', 30, 300),\n  (8, 'Тетрадь', 'Канцтовары', 40, 150),\n  (9, 'Флешка', 'Электроника', 800, 60),\n  (10, 'Футболка', 'Одежда', 1500, 40),\n  (11, 'Куртка', 'Одежда', 7000, 15);\n",
    "allowedStatement": "DELETE",
    "checkType": "state_check",
    "checkerSql": "SELECT id, name, category, price, quantity FROM products ORDER BY id",
    "orderMatters": false,
    "expectedResult": [
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
      },
      {
        "id": 9,
        "name": "Флешка",
        "category": "Электроника",
        "price": 800,
        "quantity": 60
      },
      {
        "id": 10,
        "name": "Футболка",
        "category": "Одежда",
        "price": 1500,
        "quantity": 40
      },
      {
        "id": 11,
        "name": "Куртка",
        "category": "Одежда",
        "price": 7000,
        "quantity": 15
      }
    ]
  },
  {
    "id": "drop-31",
    "orderIndex": 43,
    "topic": "drop",
    "title": "Удаление таблицы products",
    "descriptionMd": "Магазин закрывается — пора убрать за собой таблицы. Удалите таблицу `products` целиком.",
    "schemaSql": "\nCREATE TABLE products (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  category TEXT NOT NULL,\n  price REAL NOT NULL,\n  quantity INTEGER NOT NULL\n);\nINSERT INTO products (id, name, category, price, quantity) VALUES\n  (1, 'Ноутбук', 'Электроника', 55000, 10),\n  (2, 'Мышь', 'Электроника', 1200, 50),\n  (3, 'Стол', 'Мебель', 8000, 5),\n  (4, 'Стул', 'Мебель', 3000, 20),\n  (5, 'Книга', 'Книги', 500, 100),\n  (6, 'Ручка', 'Канцтовары', 50, 200);\n",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='products'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-32",
    "orderIndex": 44,
    "topic": "drop",
    "title": "Удаление временной таблицы",
    "descriptionMd": "Отладка системы логов завершена, временные данные больше не нужны. Удалите таблицу `temp_logs` целиком.",
    "schemaSql": "CREATE TABLE temp_logs (id INTEGER PRIMARY KEY, message TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='temp_logs'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-33",
    "orderIndex": 45,
    "topic": "drop",
    "title": "Удаление устаревшей таблицы заказов",
    "descriptionMd": "Старый архив заказов заменили новой системой. Удалите таблицу `old_orders` целиком.",
    "schemaSql": "CREATE TABLE old_orders (id INTEGER PRIMARY KEY, total REAL);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='old_orders'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-34",
    "orderIndex": 46,
    "topic": "drop",
    "title": "Удаление резервной таблицы клиентов",
    "descriptionMd": "Резервная копия клиентов больше не нужна. Удалите таблицу `backup_customers` целиком.",
    "schemaSql": "CREATE TABLE backup_customers (id INTEGER PRIMARY KEY, name TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='backup_customers'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-35",
    "orderIndex": 47,
    "topic": "drop",
    "title": "Удаление черновой таблицы категорий",
    "descriptionMd": "Черновик категорий согласован и в таблице больше нет необходимости. Удалите таблицу `draft_categories` целиком.",
    "schemaSql": "CREATE TABLE draft_categories (id INTEGER PRIMARY KEY, name TEXT);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='draft_categories'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-48",
    "orderIndex": 48,
    "topic": "drop",
    "title": "Удаление таблицы отзывов",
    "descriptionMd": "Отзывы перенесли в новый сервис аналитики — удалите таблицу `reviews` целиком.",
    "schemaSql": "CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, rating INTEGER NOT NULL);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'",
    "orderMatters": false,
    "expectedResult": []
  },
  {
    "id": "drop-49",
    "orderIndex": 49,
    "topic": "drop",
    "title": "Удаление таблицы платежей",
    "descriptionMd": "Оплаты теперь обрабатывает внешний платёжный сервис — удалите таблицу `payments` целиком.",
    "schemaSql": "CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, amount REAL NOT NULL);",
    "allowedStatement": "DROP TABLE",
    "checkType": "state_check",
    "checkerSql": "SELECT name FROM sqlite_master WHERE type='table' AND name='payments'",
    "orderMatters": false,
    "expectedResult": []
  }
];

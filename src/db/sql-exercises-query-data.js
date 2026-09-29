// Practice exercises for the "query" topics that follow SELECT + WHERE:
// DISTINCT, filtering operators, ORDER BY, LIMIT, aggregate functions, GROUP BY.
//
// Unlike sql-exercises-data.js (hand-written expected results), each exercise here carries
// a reference `solution`; its expected result is computed by running that solution against
// the exercise schema, so the stored answer can never drift from the data. Solutions stay
// server-side — they're never written to the database or shown to students.

const Database = require('better-sqlite3');

const SHOP_SCHEMA = `
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL
);
INSERT INTO products (id, name, category, brand, price, quantity) VALUES
  (1, 'Ноутбук', 'Электроника', 'Lenovo', 55000, 10),
  (2, 'Мышь', 'Электроника', 'Logitech', 1200, 50),
  (3, 'Клавиатура', 'Электроника', 'Logitech', 2500, 35),
  (4, 'Монитор', 'Электроника', 'Samsung', 18000, 8),
  (5, 'Флешка', 'Электроника', NULL, 800, 60),
  (6, 'Стол', 'Мебель', 'IKEA', 8000, 5),
  (7, 'Стул', 'Мебель', 'IKEA', 3000, 20),
  (8, 'Шкаф', 'Мебель', NULL, 15000, 3),
  (9, 'Учебник SQL', 'Книги', NULL, 900, 40),
  (10, 'Роман', 'Книги', NULL, 500, 100),
  (11, 'Ручка', 'Канцтовары', 'Erich Krause', 50, 200),
  (12, 'Тетрадь', 'Канцтовары', NULL, 40, 150),
  (13, 'Футболка', 'Одежда', 'Nike', 1500, 45),
  (14, 'Куртка', 'Одежда', 'Nike', 7000, 0),
  (15, 'Кроссовки', 'Одежда', 'Adidas', 6500, 12);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  city TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  order_date TEXT NOT NULL
);
INSERT INTO orders (id, customer, city, amount, status, order_date) VALUES
  (1, 'Иван', 'Москва', 56200, 'доставлен', '2026-09-01'),
  (2, 'Мария', 'Казань', 2400, 'доставлен', '2026-09-01'),
  (3, 'Иван', 'Москва', 4500, 'отменён', '2026-09-03'),
  (4, 'Алексей', 'Казань', 8000, 'доставлен', '2026-09-05'),
  (5, 'Мария', 'Казань', 500, 'в пути', '2026-09-05'),
  (6, 'Ольга', 'Москва', 13000, 'доставлен', '2026-09-08'),
  (7, 'Алексей', 'Казань', 12000, 'в пути', '2026-09-10'),
  (8, 'Мария', 'Казань', 800, 'доставлен', '2026-09-12'),
  (9, 'Ольга', 'Москва', 18000, 'доставлен', '2026-09-12'),
  (10, 'Дмитрий', 'Самара', 1500, 'доставлен', '2026-09-14'),
  (11, 'Иван', 'Москва', 1200, 'в пути', '2026-09-15'),
  (12, 'Дмитрий', 'Самара', 7000, 'отменён', '2026-09-16');
`;

const FIRST_ORDER_INDEX = 91;

const DEFINITIONS = [
  // --- DISTINCT ---
  {
    id: 'distinct-1',
    topic: 'distinct',
    title: 'Какие категории есть в магазине',
    descriptionMd:
      'Менеджер хочет увидеть, какие категории товаров вообще представлены в каталоге. Выведите столбец `category` таблицы `products` так, чтобы каждая категория встречалась **ровно один раз**.',
    solution: 'SELECT DISTINCT category FROM products',
  },
  {
    id: 'distinct-2',
    topic: 'distinct',
    title: 'Покупатели и их города без повторов',
    descriptionMd:
      'Некоторые покупатели сделали несколько заказов. Выведите уникальные пары «покупатель — город» из таблицы `orders`: столбцы `customer` и `city`, без повторяющихся строк.',
    solution: 'SELECT DISTINCT customer, city FROM orders',
  },

  // --- filtering operators ---
  {
    id: 'filter_ops-1',
    topic: 'filter_ops',
    title: 'Товары из нескольких категорий (IN)',
    descriptionMd:
      'Готовим витрину «Всё для учёбы и отдыха». Выведите `name` и `category` товаров из категорий **Книги**, **Канцтовары** и **Одежда**. Используйте оператор `IN` вместо цепочки `OR`.',
    solution: "SELECT name, category FROM products WHERE category IN ('Книги', 'Канцтовары', 'Одежда')",
  },
  {
    id: 'filter_ops-2',
    topic: 'filter_ops',
    title: 'Заказы в ценовом диапазоне (BETWEEN)',
    descriptionMd:
      'Отдел доставки обрабатывает заказы средней стоимости. Выведите `id`, `customer` и `amount` заказов, сумма которых **от 1000 до 10000 включительно**. Используйте `BETWEEN`.',
    solution: 'SELECT id, customer, amount FROM orders WHERE amount BETWEEN 1000 AND 10000',
  },
  {
    id: 'filter_ops-3',
    topic: 'filter_ops',
    title: 'Товары без бренда (IS NULL)',
    descriptionMd:
      'У части товаров не заполнен бренд — поле `brand` пустое (`NULL`). Выведите `id` и `name` таких товаров, чтобы контент-менеджер их дозаполнил.',
    solution: 'SELECT id, name FROM products WHERE brand IS NULL',
  },

  // --- ORDER BY ---
  {
    id: 'order_by-1',
    topic: 'order_by',
    title: 'Каталог от дешёвых к дорогим',
    descriptionMd:
      'Выведите `name` и `price` всех товаров, отсортировав их **по возрастанию цены** — самые дешёвые сверху. Порядок строк важен.',
    solution: 'SELECT name, price FROM products ORDER BY price',
    orderMatters: true,
  },
  {
    id: 'order_by-2',
    topic: 'order_by',
    title: 'Больше всего на складе',
    descriptionMd:
      'Склад переполнен — нужно понять, каких товаров больше всего. Выведите `name` и `quantity` всех товаров **по убыванию количества**. Порядок строк важен.',
    solution: 'SELECT name, quantity FROM products ORDER BY quantity DESC',
    orderMatters: true,
  },
  {
    id: 'order_by-3',
    topic: 'order_by',
    title: 'Сортировка по двум столбцам',
    descriptionMd:
      'Выведите `city`, `customer` и `amount` всех заказов. Отсортируйте их **по городу в алфавитном порядке**, а внутри одного города — **по сумме заказа по убыванию**. Порядок строк важен.',
    solution: 'SELECT city, customer, amount FROM orders ORDER BY city, amount DESC',
    orderMatters: true,
  },

  // --- LIMIT ---
  {
    id: 'limit-1',
    topic: 'limit',
    title: 'Топ-3 самых дорогих товара',
    descriptionMd:
      'Для баннера «Премиум» нужны **три самых дорогих товара**. Выведите их `name` и `price` — от самого дорогого. Порядок строк важен.',
    solution: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 3',
    orderMatters: true,
  },
  {
    id: 'limit-2',
    topic: 'limit',
    title: 'Вторая страница каталога (OFFSET)',
    descriptionMd:
      'Каталог показывается постранично — по **5 товаров** на странице, отсортированных по `id`. Выведите `id` и `name` товаров **второй страницы**. Порядок строк важен.',
    solution: 'SELECT id, name FROM products ORDER BY id LIMIT 5 OFFSET 5',
    orderMatters: true,
  },

  // --- aggregate functions ---
  {
    id: 'aggregate-1',
    topic: 'aggregate',
    title: 'Сколько всего товаров',
    descriptionMd:
      'Посчитайте, сколько позиций (строк) в таблице `products`. Результат — одна строка с единственным столбцом `total`.',
    solution: 'SELECT COUNT(*) AS total FROM products',
  },
  {
    id: 'aggregate-2',
    topic: 'aggregate',
    title: 'Сводка по ценам',
    descriptionMd:
      'Одной строкой выведите минимальную цену товара (`min_price`), максимальную (`max_price`) и среднюю, округлённую до двух знаков после запятой (`avg_price`). Для округления используйте `ROUND(значение, 2)`.',
    solution: 'SELECT MIN(price) AS min_price, MAX(price) AS max_price, ROUND(AVG(price), 2) AS avg_price FROM products',
  },
  {
    id: 'aggregate-3',
    topic: 'aggregate',
    title: 'Выручка по доставленным заказам',
    descriptionMd:
      "Бухгалтерии нужна выручка: сумма `amount` только по заказам со статусом **'доставлен'**. Результат — один столбец `revenue`.",
    solution: "SELECT SUM(amount) AS revenue FROM orders WHERE status = 'доставлен'",
  },

  // --- GROUP BY ---
  {
    id: 'group_by-1',
    topic: 'group_by',
    title: 'Количество товаров в каждой категории',
    descriptionMd:
      'Для каждой категории посчитайте, сколько в ней товаров. Выведите столбцы `category` и `products_count`.',
    solution: 'SELECT category, COUNT(*) AS products_count FROM products GROUP BY category',
  },
  {
    id: 'group_by-2',
    topic: 'group_by',
    title: 'Лучшие покупатели',
    descriptionMd:
      'Посчитайте, на какую общую сумму сделал заказы каждый покупатель. Выведите `customer` и `total_amount`, отсортировав по `total_amount` **по убыванию**. Порядок строк важен.',
    solution: 'SELECT customer, SUM(amount) AS total_amount FROM orders GROUP BY customer ORDER BY total_amount DESC',
    orderMatters: true,
  },
  {
    id: 'group_by-3',
    topic: 'group_by',
    title: 'Крупные города (HAVING)',
    descriptionMd:
      'Выведите города, в которых общая сумма заказов **больше 20000**: столбцы `city` и `total_amount`. Условие на результат группировки задаётся через `HAVING`, а не `WHERE`.',
    solution: 'SELECT city, SUM(amount) AS total_amount FROM orders GROUP BY city HAVING SUM(amount) > 20000',
  },
];

function computeExpected(schemaSql, solution) {
  const conn = new Database(':memory:');
  try {
    conn.exec(schemaSql);
    return conn.prepare(solution).all();
  } finally {
    conn.close();
  }
}

const exercises = DEFINITIONS.map((def, i) => ({
  id: def.id,
  orderIndex: FIRST_ORDER_INDEX + i,
  topic: def.topic,
  title: def.title,
  descriptionMd: def.descriptionMd,
  schemaSql: SHOP_SCHEMA,
  allowedStatement: 'SELECT',
  checkType: 'select_match',
  checkerSql: null,
  orderMatters: !!def.orderMatters,
  expectedResult: computeExpected(SHOP_SCHEMA, def.solution),
}));

module.exports = exercises;
module.exports.SOLUTIONS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.solution]));

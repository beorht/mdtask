// The three themes of the IB final exam. A theme gives the server its story, the application
// (config, log, database paths), staff accounts and the database tables the SQL stage uses.
// Everything a student sees is in Russian.

const THEMES = {
  shop: {
    key: 'shop',
    label: 'Интернет-магазин',
    company: 'интернет-магазин «ТехноМаркет»',
    app: 'shopd',
    service: 'служба заказов интернет-магазина',
    staff: [
      ['manager1', 'Иванова Анна'],
      ['manager2', 'Петров Олег'],
      ['operator', 'Сидорова Мария'],
      ['kassir', 'Ким Денис'],
      ['sklad', 'Юсупов Тимур'],
      ['buhgalter', 'Орлова Елена'],
      ['marketing', 'Захаров Игорь'],
    ],
    // Main table the attacker damaged; `value` is the money column he lowered.
    sql: {
      main: 'orders',
      mainLabel: 'заказы',
      recordWord: 'заказ',
      value: 'amount',
      valueLabel: 'сумма заказа',
      person: { table: 'customers', fk: 'customer_id', label: 'клиент', column: 'customer' },
      item: { table: 'products', fk: 'product_id' },
    },
    secretServices: ['Платёжный шлюз', 'Курьерская служба', 'Склад', 'Почтовый сервер', 'CRM'],
  },
  library: {
    key: 'library',
    label: 'Библиотека',
    company: 'городская библиотека №7',
    app: 'libcat',
    service: 'электронный каталог и абонемент библиотеки',
    staff: [
      ['librarian1', 'Смирнова Ольга'],
      ['librarian2', 'Каримов Рустам'],
      ['katalog', 'Белова Ирина'],
      ['abonement', 'Нуриев Азат'],
      ['metodist', 'Громова Светлана'],
      ['zav', 'Фролов Андрей'],
    ],
    sql: {
      main: 'loans',
      mainLabel: 'выдачи книг',
      recordWord: 'выдача',
      value: 'fine',
      valueLabel: 'штраф за просрочку',
      person: { table: 'readers', fk: 'reader_id', label: 'читатель', column: 'reader' },
      item: { table: 'books', fk: 'book_id' },
    },
    secretServices: ['Электронный каталог', 'Учёт читателей', 'Почтовый сервер', 'Сайт библиотеки', 'Резервное копирование'],
  },
  clinic: {
    key: 'clinic',
    label: 'Поликлиника',
    company: 'поликлиника «Здоровье+»',
    app: 'medreg',
    service: 'служба записи к врачу',
    staff: [
      ['registrator1', 'Алиева Камила'],
      ['registrator2', 'Морозов Павел'],
      ['nurse', 'Васильева Нина'],
      ['glavvrach', 'Ахмедов Бахтиёр'],
      ['kassa', 'Лебедева Дарья'],
      ['statist', 'Соколов Артём'],
    ],
    sql: {
      main: 'appointments',
      mainLabel: 'приёмы',
      recordWord: 'приём',
      value: 'price',
      valueLabel: 'стоимость приёма',
      person: { table: 'patients', fk: 'patient_id', label: 'пациент', column: 'patient' },
      item: { table: 'doctors', fk: 'doctor_id' },
    },
    secretServices: ['Лабораторная система', 'Учёт пациентов', 'Почтовый сервер', 'Касса', 'Резервное копирование'],
  },
};

const THEME_KEYS = Object.keys(THEMES);

module.exports = { THEMES, THEME_KEYS };

// Shared ordered list of SQL trainer topics — used by both the sidebar and the trainer routes
// so the topic order/labels stay in one place.
const TOPICS = [
  { key: 'create_table', label: 'CREATE TABLE' },
  { key: 'insert', label: 'INSERT INTO' },
  { key: 'select', label: 'SELECT' },
  { key: 'where', label: 'WHERE' },
  { key: 'update', label: 'UPDATE' },
  { key: 'delete', label: 'DELETE' },
  { key: 'drop', label: 'DROP TABLE' },
  { key: 'select_where', label: 'SELECT + WHERE: вывод данных' },
  { key: 'distinct', label: 'Выборка уникальных значений. Оператор DISTINCT' },
  { key: 'filter_ops', label: 'Операторы фильтрации' },
  { key: 'order_by', label: 'Сортировка. ORDER BY' },
  { key: 'limit', label: 'Получение диапазона строк. Оператор LIMIT' },
  { key: 'aggregate', label: 'Агрегатные функции' },
  { key: 'group_by', label: 'Группировка' },
  // Theory-only topics: no practice exercises exist for these yet, only lecture material.
  { key: 'primary_key', label: 'ID / Ключи — PRIMARY KEY' },
  { key: 'foreign_key', label: 'FOREIGN KEY — связи между таблицами' },
  { key: 'join', label: 'JOIN — соединение таблиц' },
];

const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));

// All groups now get the full trainer curriculum.
function getAllowedTopicKeys() {
  return TOPICS.map((t) => t.key);
}

function getTopicsForUser(user) {
  const allowed = getAllowedTopicKeys(user);
  return TOPICS.filter((t) => allowed.includes(t.key));
}

module.exports = { TOPICS, TOPIC_LABELS, getAllowedTopicKeys, getTopicsForUser };

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
  // Keys and links. primary_key and foreign_key are theory-only (no exercises yet);
  // relations and join have practice (src/db/sql-exercises-{relations,join}-data.js).
  { key: 'primary_key', label: 'ID / Ключи — PRIMARY KEY' },
  { key: 'foreign_key', label: 'FOREIGN KEY — связи между таблицами' },
  { key: 'relations', label: 'Связи между таблицами: зачем и как' },
  { key: 'join', label: 'JOIN — соединение таблиц' },
  // "Практикум" — a separate section after all topics: mixed practice on what came before.
  // It continues the same unlock chain (opens once JOIN is solved).
  { key: 'keys_join', label: 'Ключи, связи и JOIN', section: 'practicum' },
];

// Sections of the topic list, in display order. A topic without `section` is in 'topics'.
const SECTIONS = [
  { key: 'topics', title: 'Темы' },
  { key: 'practicum', title: 'Практикум' },
];

// [{ key, title, topics: [...] }] for the given topics; empty sections are dropped.
function groupBySection(topics) {
  return SECTIONS.map((section) => ({
    ...section,
    topics: topics.filter((t) => (t.section || 'topics') === section.key),
  })).filter((section) => section.topics.length > 0);
}

const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));

// All groups now get the full trainer curriculum.
function getAllowedTopicKeys() {
  return TOPICS.map((t) => t.key);
}

function getTopicsForUser(user) {
  const allowed = getAllowedTopicKeys(user);
  return TOPICS.filter((t) => allowed.includes(t.key));
}

module.exports = { TOPICS, TOPIC_LABELS, SECTIONS, groupBySection, getAllowedTopicKeys, getTopicsForUser };

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
];

const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));

module.exports = { TOPICS, TOPIC_LABELS };

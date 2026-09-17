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

// Some student groups only get the SELECT + WHERE practice track, not the full trainer curriculum.
// Teachers always see/manage everything regardless of this restriction.
const RESTRICTED_GROUPS = ['IB', 'WEB'];
const RESTRICTED_TOPIC_KEYS = ['select_where'];

function getAllowedTopicKeys({ role, group }) {
  if (role === 'student' && RESTRICTED_GROUPS.includes(group)) return RESTRICTED_TOPIC_KEYS;
  return TOPICS.map((t) => t.key);
}

function getTopicsForUser(user) {
  const allowed = getAllowedTopicKeys(user);
  return TOPICS.filter((t) => allowed.includes(t.key));
}

module.exports = { TOPICS, TOPIC_LABELS, getAllowedTopicKeys, getTopicsForUser };

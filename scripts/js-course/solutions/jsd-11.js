const n = Number(input());
const groups = {};
for (let i = 0; i < n; i++) {
  const [name, group, score] = input().split(' ');
  if (!groups[group]) groups[group] = [];
  groups[group].push({ name, score: Number(score) });
}
for (const [group, list] of Object.entries(groups)) {
  const avg = list.reduce((s, x) => s + x.score, 0) / list.length;
  const best = list.reduce((b, x) => (x.score > b.score ? x : b));
  console.log(group + ': ' + list.map((x) => x.name + '(' + x.score + ')').join(', '));
  console.log('  среднее: ' + avg.toFixed(1));
  console.log('  лучший: ' + best.name);
}

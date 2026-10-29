const ids = input().split(' ');
const answers = await Promise.all(ids.map((id) => fetch('http://api.edu/students/' + id).then(async (r) => ({ id, ok: r.ok, data: await r.json() }))));
const students = [];
for (const a of answers) {
  if (!a.ok) console.log('студент ' + a.id + ' не найден');
  else {
    const s = a.data;
    students.push({ ...s, avg: s.scores.reduce((x, y) => x + y, 0) / s.scores.length });
  }
}
students.sort((a, b) => b.avg - a.avg);
students.forEach((s) => console.log(s.name + ' (' + s.group + '): ' + s.avg.toFixed(2)));
const groups = new Map();
for (const s of students) {
  const g = groups.get(s.group) || [];
  g.push(s.avg);
  groups.set(s.group, g);
}
let best = null;
let bestAvg = -1;
for (const [g, list] of groups) {
  const avg = list.reduce((x, y) => x + y, 0) / list.length;
  if (avg > bestAvg) {
    best = g;
    bestAvg = avg;
  }
}
console.log('лучшая группа: ' + best);

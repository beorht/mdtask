const n = Number(input());
const rows = Array.from({ length: n }, () => {
  const [name, ...marks] = input().split(' ');
  const avg = marks.map(Number).reduce((s, x) => s + x, 0) / marks.length;
  return { name, avg };
});
rows.forEach((r) => console.log(r.name + ': ' + r.avg.toFixed(2)));
console.log('лучший: ' + rows.reduce((b, r) => (r.avg > b.avg ? r : b)).name);

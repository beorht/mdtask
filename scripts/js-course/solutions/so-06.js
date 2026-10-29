const n = Number(input());
const rows = Array.from({ length: n }, () => {
  const [name, score] = input().split(' ');
  return { name, score: Number(score) };
});
rows.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
rows.forEach((r, i) => console.log(i + 1 + '. ' + r.name + ' — ' + r.score));

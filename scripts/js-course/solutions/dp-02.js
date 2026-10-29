const n = Number(input());
const buyers = new Map();
for (let i = 0; i < n; i++) {
  const [name, sum] = input().split(' ');
  const b = buyers.get(name) || { name, sum: 0, count: 0 };
  b.sum += Number(sum);
  b.count++;
  buyers.set(name, b);
}
const k = Number(input());
const top = [...buyers.values()].sort((a, b) => b.sum - a.sum || b.count - a.count || (a.name < b.name ? -1 : 1)).slice(0, k);
top.forEach((b, i) => console.log(i + 1 + '. ' + b.name + ' — ' + b.sum + ' (покупок: ' + b.count + ')'));

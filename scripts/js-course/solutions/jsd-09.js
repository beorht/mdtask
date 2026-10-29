const n = Number(input());
const groups = new Map();
for (let i = 0; i < n; i++) {
  const [name, cat, price] = input().split(';');
  if (!groups.has(cat)) groups.set(cat, { names: [], sum: 0 });
  groups.get(cat).names.push(name);
  groups.get(cat).sum += Number(price);
}
for (const [cat, g] of groups) console.log(cat + ': ' + g.names.join(', ') + ' — сумма ' + g.sum);

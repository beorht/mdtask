const groups = new Map();
for (const w of input().split(' ')) {
  const key = w.toLowerCase().split('').sort().join('');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(w);
}
let any = false;
for (const g of groups.values()) {
  if (g.length > 1) {
    console.log(g.join(' '));
    any = true;
  }
}
if (!any) console.log('анаграмм нет');

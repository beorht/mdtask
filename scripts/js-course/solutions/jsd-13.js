const route = JSON.parse(input());
let best = [];
let loop = false;
for (const start of Object.keys(route)) {
  const seen = new Set();
  const chain = [];
  let cur = start;
  while (cur !== undefined && !seen.has(cur)) {
    seen.add(cur);
    chain.push(cur);
    cur = route[cur];
  }
  if (cur !== undefined) loop = true;
  if (chain.length > best.length) best = chain;
}
console.log(best.join(' → '));
console.log('длина: ' + best.length);
console.log('зацикливание: ' + (loop ? 'да' : 'нет'));

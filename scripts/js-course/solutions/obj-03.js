const count = {};
for (const w of input().toLowerCase().split(' ')) count[w] = (count[w] || 0) + 1;
const used = {};
for (let k = 0; k < 3; k++) {
  let best = null;
  for (const w in count) if (!used[w] && (best === null || count[w] > count[best])) best = w;
  if (best === null) break;
  used[best] = true;
  console.log(best + ' — ' + count[best]);
}

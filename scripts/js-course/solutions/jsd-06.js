const map = {};
for (const pair of input().split(' ')) {
  const [from, to] = pair.split(':');
  map[from] = to;
}
let out = '';
let changed = 0;
for (const ch of input()) {
  if (ch in map) {
    out += map[ch];
    changed++;
  } else out += ch;
}
console.log(out);
console.log(changed);

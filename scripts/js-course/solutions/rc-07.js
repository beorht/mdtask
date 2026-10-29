function permutations(s) {
  if (s.length <= 1) return [s];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    for (const p of permutations(s.slice(0, i) + s.slice(i + 1))) out.push(s[i] + p);
  }
  return out;
}
const all = permutations(input());
for (const p of all) console.log(p);
console.log('всего: ' + all.length);

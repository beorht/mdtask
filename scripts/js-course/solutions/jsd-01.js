const count = {};
for (const w of input().split(' ')) count[w] = (count[w] || 0) + 1;
for (const w in count) {
  const n = count[w];
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  console.log(w + ' — ' + n + (few ? ' раза' : ' раз'));
}

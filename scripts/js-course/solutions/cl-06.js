function limit(fn, max) {
  let calls = 0;
  return (x) => {
    if (calls >= max) return 'лимит исчерпан';
    calls++;
    return fn(x);
  };
}
const sq = limit((x) => x * x, Number(input()));
while (true) {
  const s = input();
  if (s === 'конец') break;
  console.log(sq(Number(s)));
}

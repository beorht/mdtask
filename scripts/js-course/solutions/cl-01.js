function makeCounter(start) {
  let n = start;
  return () => ++n;
}
const counters = { a: makeCounter(Number(input())), b: makeCounter(Number(input())) };
while (true) {
  const c = input();
  if (c === 'конец') break;
  console.log(c + ': ' + counters[c]());
}

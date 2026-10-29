function makeIdGenerator(prefix) {
  let n = 0;
  return () => prefix + '-' + ++n;
}
const gens = {};
while (true) {
  const p = input();
  if (p === 'конец') break;
  if (!gens[p]) gens[p] = makeIdGenerator(p);
  console.log(gens[p]());
}

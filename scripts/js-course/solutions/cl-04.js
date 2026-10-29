function makeMultiplier(k) {
  return (x) => x * k;
}
const n = Number(input());
const mult = [];
for (let k = 1; k <= n; k++) mult.push(makeMultiplier(k));
for (let i = 1; i <= n; i++) {
  let row = '';
  for (const m of mult) row += m(i) + ' ';
  console.log(row.trim());
}

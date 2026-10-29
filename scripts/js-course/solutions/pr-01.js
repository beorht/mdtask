function sum(...nums) {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}
const values = [];
for (const p of input().split(' ')) values.push(Number(p));
console.log(sum(...values));
console.log(sum());

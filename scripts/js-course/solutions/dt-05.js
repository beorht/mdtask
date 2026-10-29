let seed = Number(input());
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const n = Number(input());
const count = new Array(13).fill(0);
let doubles = 0;
for (let i = 0; i < n; i++) {
  const a = 1 + Math.floor(random() * 6);
  const b = 1 + Math.floor(random() * 6);
  console.log(a, b);
  if (a === b) doubles++;
  count[a + b]++;
}
let best = 2;
for (let s = 2; s <= 12; s++) if (count[s] > count[best]) best = s;
console.log('дублей: ' + doubles);
console.log(best);

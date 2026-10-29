let seed = Number(input());
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const n = Number(input());
let inside = 0;
for (let i = 0; i < n; i++) {
  const x = random();
  const y = random();
  if (x * x + y * y < 1) inside++;
}
const pi = 4 * inside / n;
console.log(pi.toFixed(4));
console.log(Math.abs(pi - Math.PI).toFixed(4));

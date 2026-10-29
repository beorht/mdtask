function pipe(...fns) {
  return (x) => {
    for (const f of fns) x = f(x);
    return x;
  };
}
const steps = {
  trim: (s) => s.trim(),
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  reverse: (s) => s.split('').reverse().join(''),
  dup: (s) => s + ' ' + s,
};
const text = input();
const names = input().split(' ');
const fns = [];
for (const n of names) fns.push(steps[n]);
console.log(pipe(...fns)(text));

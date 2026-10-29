function makeAverager() {
  let sum = 0;
  let count = 0;
  return (x) => {
    sum += x;
    count++;
    return sum / count;
  };
}
const add = makeAverager();
while (true) {
  const s = input();
  if (s === 'конец') break;
  console.log(add(Number(s)).toFixed(2));
}

let first = -Infinity;
let second = -Infinity;
for (const x of input().split(' ').map(Number)) {
  if (x > first) {
    second = first;
    first = x;
  } else if (x < first && x > second) second = x;
}
console.log(second === -Infinity ? 'нет' : second);

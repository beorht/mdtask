const a = input().split(' ').map(Number);
const target = Number(input());
const seen = new Map();
let answer = 'нет';
for (let j = 0; j < a.length; j++) {
  const need = target - a[j];
  if (seen.has(need)) {
    answer = seen.get(need) + 1 + ' ' + (j + 1);
    break;
  }
  if (!seen.has(a[j])) seen.set(a[j], j);
}
console.log(answer);

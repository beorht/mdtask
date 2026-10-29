const a = input().split(' ').map(Number);
const x = Number(input());
let removed = 0;
for (let i = a.length - 1; i >= 0; i--) {
  if (a[i] === x) {
    a.splice(i, 1);
    removed++;
  }
}
console.log(a.length ? a.join(' ') : 'пусто');
console.log(removed);

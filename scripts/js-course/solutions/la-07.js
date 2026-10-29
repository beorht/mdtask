const a = input().split(' ').map(Number);
const leaders = [];
let max = -Infinity;
for (let i = a.length - 1; i >= 0; i--) {
  if (a[i] > max) {
    leaders.unshift(a[i]);
    max = a[i];
  }
}
console.log(leaders.join(' '));

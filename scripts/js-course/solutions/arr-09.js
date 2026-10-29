const a = input().split(' ').map(Number);
let best = a[0];
let bestFrom = 0;
let bestTo = 0;
let cur = 0;
let from = 0;
for (let i = 0; i < a.length; i++) {
  if (cur <= 0) {
    cur = a[i];
    from = i;
  } else cur += a[i];
  if (cur > best) {
    best = cur;
    bestFrom = from;
    bestTo = i;
  }
}
console.log(best, bestFrom + 1, bestTo + 1);

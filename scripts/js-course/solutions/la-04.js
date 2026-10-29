const a = input().split(' ').map(Number);
let bestStart = 0;
let bestLen = 1;
let start = 0;
for (let i = 1; i <= a.length; i++) {
  if (i === a.length || a[i] <= a[i - 1]) {
    if (i - start > bestLen) {
      bestLen = i - start;
      bestStart = start;
    }
    start = i;
  }
}
console.log(bestLen);
console.log(a.slice(bestStart, bestStart + bestLen).join(' '));

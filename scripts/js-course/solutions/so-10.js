const a = input().split(' ').map(Number);
const upper = (x) => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (a[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};
console.log(input().split(' ').map((s) => upper(Number(s))).join(' '));

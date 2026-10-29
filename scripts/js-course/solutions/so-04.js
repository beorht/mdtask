const a = input().split(' ').map(Number);
for (const x of input().split(' ').map(Number)) {
  let lo = 0;
  let hi = a.length - 1;
  let steps = 0;
  let pos = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    steps++;
    if (a[mid] === x) {
      pos = mid;
      break;
    }
    if (a[mid] < x) lo = mid + 1;
    else hi = mid - 1;
  }
  console.log((pos === -1 ? 'нет' : pos + 1) + ' ' + steps);
}

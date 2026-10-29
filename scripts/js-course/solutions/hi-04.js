function sortBy(arr, compare) {
  const a = arr.slice();
  for (let i = 1; i < a.length; i++) {
    const cur = a[i];
    let j = i - 1;
    while (j >= 0 && compare(a[j], cur) > 0) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = cur;
  }
  return a;
}
const words = input().split(' ');
console.log(sortBy(words, (x, y) => x.length - y.length || (x < y ? -1 : x > y ? 1 : 0)).join(' '));
console.log(sortBy(words, (x, y) => y.length - x.length).join(' '));

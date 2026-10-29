function countIf(arr, pred) {
  let c = 0;
  for (const x of arr) if (pred(x)) c++;
  return c;
}
const nums = [];
for (const p of input().split(' ')) nums.push(Number(p));
console.log('чётных: ' + countIf(nums, (x) => x % 2 === 0));
console.log('положительных: ' + countIf(nums, (x) => x > 0));
console.log('двузначных: ' + countIf(nums, (x) => Math.abs(x) >= 10 && Math.abs(x) <= 99));

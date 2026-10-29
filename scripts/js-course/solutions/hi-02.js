function myReduce(arr, fn, start) {
  let acc = start;
  for (const x of arr) acc = fn(acc, x);
  return acc;
}
const nums = [];
for (const p of input().split(' ')) nums.push(Number(p));
console.log('сумма: ' + myReduce(nums, (a, x) => a + x, 0));
console.log('произведение: ' + myReduce(nums, (a, x) => a * x, 1));
console.log('максимум: ' + myReduce(nums, (a, x) => (x > a ? x : a), nums[0]));

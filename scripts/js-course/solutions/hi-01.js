function myMap(arr, fn) {
  const out = [];
  for (let i = 0; i < arr.length; i++) out.push(fn(arr[i], i));
  return out;
}
function myFilter(arr, fn) {
  const out = [];
  for (const x of arr) if (fn(x)) out.push(x);
  return out;
}
const nums = [];
for (const p of input().split(' ')) nums.push(Number(p));
let s = 0;
for (const x of nums) s += x;
const avg = s / nums.length;
console.log(myMap(nums, (x) => x * x).join(' '));
console.log(myFilter(nums, (x) => x > avg).join(' '));

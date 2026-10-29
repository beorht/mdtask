function flatten(arr) {
  const out = [];
  for (const x of arr) {
    if (Array.isArray(x)) out.push(...flatten(x));
    else out.push(x);
  }
  return out;
}
function depth(arr) {
  let d = 0;
  for (const x of arr) if (Array.isArray(x)) d = Math.max(d, depth(x));
  return d + 1;
}
const data = JSON.parse(input());
console.log(flatten(data).join(' '));
console.log(depth(data));

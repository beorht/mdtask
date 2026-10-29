const a = input().split(' ').map(Number);
const pre = [0];
for (const x of a) pre.push(pre[pre.length - 1] + x);
const q = Number(input());
for (let i = 0; i < q; i++) {
  const [l, r] = input().split(' ').map(Number);
  console.log(pre[r] - pre[l - 1]);
}

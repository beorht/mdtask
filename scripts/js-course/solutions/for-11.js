const s = input();
let p = 1;
let zeros = 0;
for (let i = 0; i < s.length; i++) {
  p *= Number(s[i]);
  if (s[i] === '0') zeros++;
}
console.log(p, zeros);

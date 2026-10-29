const count = new Array(10).fill(0);
for (const ch of input()) if (ch >= '0' && ch <= '9') count[Number(ch)]++;
let any = false;
count.forEach((c, d) => {
  if (c) {
    console.log(d + ': ' + c);
    any = true;
  }
});
if (!any) console.log('цифр нет');

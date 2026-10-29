const count = {};
for (const ch of input().toLowerCase()) if (ch !== ' ') count[ch] = (count[ch] || 0) + 1;
let any = false;
for (const ch in count) {
  if ('аеёиоуыэюяaeiouy'.includes(ch)) {
    console.log(ch + ' — ' + count[ch]);
    any = true;
  }
}
if (!any) console.log('гласных нет');

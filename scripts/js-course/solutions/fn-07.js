function countVowels(word) {
  let c = 0;
  for (const ch of word.toLowerCase()) if ('аеёиоуыэюя'.includes(ch)) c++;
  return c;
}
const words = input().split(' ');
let best = words[0];
for (const w of words) if (countVowels(w) > countVowels(best)) best = w;
console.log(best, countVowels(best));

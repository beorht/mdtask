const names = input().split(' ');
const phones = input().split(' ');
const book = {};
for (let i = 0; i < names.length; i++) book[names[i]] = phones[i];
while (true) {
  const q = input();
  if (q === 'конец') break;
  console.log(q in book ? book[q] : 'не найден');
}

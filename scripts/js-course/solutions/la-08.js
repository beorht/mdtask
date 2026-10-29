const items = input().split(', ');
items.forEach((item, i) => console.log(i + 1 + '. ' + item));
console.log('Всего: ' + items.length);

const ch = input().toLowerCase();
if (ch >= '0' && ch <= '9') console.log('цифра');
else if ('аеёиоуыэюя'.includes(ch)) console.log('гласная');
else if ((ch >= 'а' && ch <= 'я') || ch === 'ё') console.log('согласная');
else console.log('другое');

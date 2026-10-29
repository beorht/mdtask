const sum = Number(input());
let d = 0;
if (sum >= 10000) d = 10;
else if (sum >= 5000) d = 5;
console.log('Скидка: ' + d + '%');
console.log('К оплате: ' + (sum - sum * d / 100));

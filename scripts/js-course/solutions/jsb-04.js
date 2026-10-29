let n = Number(input());
console.log('100: ' + Math.floor(n / 100));
n %= 100;
console.log('50: ' + Math.floor(n / 50));
n %= 50;
console.log('10: ' + Math.floor(n / 10));
n %= 10;
console.log('5: ' + Math.floor(n / 5));
console.log('1: ' + n % 5);

let cents = 0;
for (let i = 0; i < 3; i++) cents += Math.round(Number(input()) * 100);
console.log((cents / 100).toFixed(2));

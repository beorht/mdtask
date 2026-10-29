const secret = Number(input());
const guess = Number(input());
if (guess === secret) console.log('Угадал!');
else if (secret > guess) console.log('Загаданное больше');
else console.log('Загаданное меньше');

function makeWallet(balance) {
  return {
    deposit: (x) => { balance += x; },
    withdraw: (x) => {
      if (x > balance) return false;
      balance -= x;
      return true;
    },
    getBalance: () => balance,
  };
}
const w = makeWallet(Number(input()));
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [op, sum] = line.split(' ');
  if (op === '+') w.deposit(Number(sum));
  else if (op === '-') {
    if (!w.withdraw(Number(sum))) console.log('недостаточно средств');
  } else console.log(w.getBalance());
}

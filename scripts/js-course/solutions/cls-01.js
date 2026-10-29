class BankAccount {
  #balance;
  #history = [];
  constructor(owner, balance) {
    this.owner = owner;
    this.#balance = balance;
  }
  deposit(x) {
    this.#balance += x;
    this.#history.push('+' + x);
  }
  withdraw(x) {
    if (x > this.#balance) throw new Error('недостаточно средств');
    this.#balance -= x;
    this.#history.push('-' + x);
  }
  get balance() {
    return this.#balance;
  }
  history() {
    return [...this.#history];
  }
}
const acc = new BankAccount(input(), Number(input()));
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [op, x] = line.split(' ');
  try {
    if (op === '+') acc.deposit(Number(x));
    else if (op === '-') acc.withdraw(Number(x));
    else console.log(acc.owner + ': ' + acc.balance);
  } catch (e) {
    console.log('ошибка: ' + e.message);
  }
}
console.log(acc.history().join(' '));

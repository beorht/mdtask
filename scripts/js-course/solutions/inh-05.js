class Account {
  constructor(owner, balance) { this.owner = owner; this.balance = balance; }
  canWithdraw(x) { return x <= this.balance; }
  withdraw(x) {
    if (!this.canWithdraw(x)) throw new Error('недостаточно средств');
    this.balance -= x;
  }
}
class SavingsAccount extends Account {
  #count = 0;
  withdraw(x) {
    if (this.#count >= 3) throw new Error('лимит снятий');
    super.withdraw(x);
    this.#count++;
  }
}
class CreditAccount extends Account {
  constructor(owner, balance, limit) { super(owner, balance); this.limit = limit; }
  canWithdraw(x) { return this.balance - x >= -this.limit; }
}
const [type, owner, ...nums] = input().split(' ');
const types = { basic: Account, savings: SavingsAccount, credit: CreditAccount };
const acc = new types[type](owner, ...nums.map(Number));
while (true) {
  const s = input();
  if (s === 'конец') break;
  try {
    acc.withdraw(Number(s));
    console.log(acc.balance);
  } catch (e) {
    console.log('отказ: ' + e.message);
  }
}

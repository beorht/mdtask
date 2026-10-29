class Employee {
  constructor(name, salary) { this.name = name; this.salary = salary; }
  pay() { return this.salary; }
  role() { return 'сотрудник'; }
}
class Manager extends Employee {
  constructor(name, salary, bonus) { super(name, salary); this.bonus = bonus; }
  pay() { return super.pay() + this.bonus; }
  role() { return 'менеджер'; }
}
class Intern extends Employee {
  pay() { return super.pay() / 2; }
  role() { return 'стажёр'; }
}
class Contractor extends Employee {
  constructor(name, hours, rate) { super(name, 0); this.hours = hours; this.rate = rate; }
  pay() { return this.hours * this.rate; }
  role() { return 'подрядчик'; }
}
const types = { employee: Employee, manager: Manager, intern: Intern, contractor: Contractor };
const staff = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [type, name, ...nums] = line.split(' ');
  staff.push(new types[type](name, ...nums.map(Number)));
}
const roles = new Map();
let fund = 0;
for (const s of staff) {
  console.log(s.name + ' (' + s.role() + '): ' + s.pay());
  fund += s.pay();
  roles.set(s.role(), (roles.get(s.role()) || 0) + 1);
}
console.log('фонд: ' + fund);
for (const [r, k] of roles) console.log(r + ': ' + k);

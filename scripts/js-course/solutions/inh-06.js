class Field {
  constructor(name, value) { this.name = name; this.value = value; }
  validate() { return this.value === '' ? ['обязательное поле'] : []; }
}
class NumberField extends Field {
  constructor(name, value, min, max) { super(name, value); this.min = Number(min); this.max = Number(max); }
  validate() {
    const errors = super.validate();
    if (errors.length) return errors;
    const x = Number(this.value);
    if (Number.isNaN(x)) return ['не число'];
    return x < this.min || x > this.max ? ['от ' + this.min + ' до ' + this.max] : [];
  }
}
class EmailField extends Field {
  validate() {
    const errors = super.validate();
    return errors.length || this.value.includes('@') ? errors : ['нет @'];
  }
}
class PasswordField extends Field {
  validate() {
    const errors = super.validate();
    if (errors.length) return errors;
    if (this.value.length < 8) errors.push('короткий пароль');
    if (!/[0-9]/.test(this.value)) errors.push('нужна цифра');
    return errors;
  }
}
const types = { text: Field, number: NumberField, email: EmailField, password: PasswordField };
let total = 0;
while (true) {
  const line = input();
  if (line === 'конец') break;
  const [type, ...args] = line.split(';');
  const errors = new types[type](...args).validate();
  total += errors.length;
  console.log(args[0] + ': ' + (errors.length ? errors.join(', ') : 'ок'));
}
console.log(total ? 'ошибок: ' + total : 'форма верна');

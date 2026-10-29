const a = Number(input());
const op = input();
const b = Number(input());
switch (op) {
  case '+': console.log(a + b); break;
  case '-': console.log(a - b); break;
  case '*': console.log(a * b); break;
  case '/': console.log(b === 0 ? 'делить на ноль нельзя' : a / b); break;
  default: console.log('неизвестная операция');
}

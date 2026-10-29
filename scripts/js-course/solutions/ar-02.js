const ops = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '%': (a, b) => a % b,
};
const parts = input().split(' ');
const op = ops[parts[1]];
console.log(op ? op(Number(parts[0]), Number(parts[2])) : 'неизвестная операция');

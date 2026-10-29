const memo = {};
let computed = 0;
function fib(n) {
  if (n in memo) return memo[n];
  computed++;
  memo[n] = n < 2 ? n : fib(n - 1) + fib(n - 2);
  return memo[n];
}
const n = Number(input());
console.log(fib(n), computed);

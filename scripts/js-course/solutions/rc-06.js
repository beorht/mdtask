function toBinary(n) {
  if (n < 2) return String(n);
  return toBinary(Math.floor(n / 2)) + (n % 2);
}
console.log(toBinary(Number(input())));

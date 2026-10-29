function digitSum(n) {
  if (n < 10) return n;
  return n % 10 + digitSum(Math.floor(n / 10));
}
console.log(digitSum(Number(input())));

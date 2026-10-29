const coins = [10, 5, 2, 1];
function ways(sum, k) {
  if (sum === 0) return 1;
  if (sum < 0 || k === coins.length) return 0;
  return ways(sum - coins[k], k) + ways(sum, k + 1);
}
console.log(ways(Number(input()), 0));

const km = Number(input());
let cost = 5000;
if (km > 3) cost += (Math.min(km, 10) - 3) * 2000;
if (km > 10) cost += (km - 10) * 1500;
console.log(cost);

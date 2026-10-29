const m = Number(input());
const y = Number(input());
const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
switch (m) {
  case 2: console.log(leap ? 29 : 28); break;
  case 4: case 6: case 9: case 11: console.log(30); break;
  default: console.log(31);
}

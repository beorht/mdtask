const a = Number(input());
const b = Number(input());
const c = Number(input());
if (a >= b + c || b >= a + c || c >= a + b) console.log('не треугольник');
else if (a === b && b === c) console.log('равносторонний');
else if (a === b || b === c || a === c) console.log('равнобедренный');
else console.log('разносторонний');

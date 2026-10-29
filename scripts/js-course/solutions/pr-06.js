function profile(name, age = 'не указан', ...hobbies) {
  let list = '';
  for (const h of hobbies) list += (list ? ', ' : '') + h;
  return 'Имя: ' + name + '\nВозраст: ' + age + '\nУвлечения: ' + (list || 'нет');
}
const p = input().split(';');
const hobbies = p.slice(2);
console.log(profile(p[0], p[1] === '' || p[1] === undefined ? undefined : p[1], ...hobbies));

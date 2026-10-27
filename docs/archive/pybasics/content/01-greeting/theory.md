## Dastur va ekranga chiqarish

Python’dagi dastur — bu buyruqlar ro‘yxati. Buyruqlar **tartib bilan, yuqoridan pastga** bajariladi, har bir qatorda bitta buyruq.

Ekranga biror narsa chiqarish uchun `print()` funksiyasidan foydalaniladi. Chiqariladigan narsa qavs ichiga yoziladi. Har bir `print()` chaqiruvi **bitta qator** chiqaradi va keyingi qatorga o‘tadi.

| Qavs ichida yozilgan | Ekranda paydo bo‘ladi |
|---|---|
| `"Xayrli tong"` | Xayrli tong |
| `2 + 3` | 5 |
| `"2 + 3"` | 2 + 3 |

Qo‘shtirnoq ichidagi matn o‘zgarishsiz chiqariladi, qo‘shtirnoqsiz ifodani esa Python avval hisoblaydi.

## Satrlar

Dasturdagi matn **satr** deb ataladi (`str` turi). Satr qo‘shtirnoq ichida yoziladi: `"..."` yoki `'...'` — farqi yo‘q, faqat ochuvchi va yopuvchi qo‘shtirnoq bir xil bo‘lishi kerak.

Satrlarni `+` belgisi bilan **ulash** mumkin: `"Kitob"` va `"lar"` dan `"Kitoblar"` hosil bo‘ladi. Bo‘sh joy o‘z-o‘zidan qo‘shilmaydi: bo‘sh joy kerak bo‘lsa, u qo‘shtirnoq ichida bo‘lishi kerak.

## O‘zgaruvchilar

**O‘zgaruvchi** — dastur qiymatni eslab qoladigan nom. Qiymat o‘zgaruvchiga `=` belgisi bilan joylanadi (bu *o‘zlashtirish* deyiladi): chapda nom, o‘ngda qiymat. Masalan, `city = "Toshkent"` yozuvi «Toshkent satrini city nomi ostida eslab qol» degani.

Keyin dasturda qiymat o‘rniga o‘zgaruvchi nomini yozish mumkin — Python uning ichidagi qiymatni qo‘yadi. Bitta o‘zgaruvchidan istalgancha marta foydalanish mumkin.

O‘zgaruvchi nomlari uchun qoidalar:

| Mumkin | Mumkin emas |
|---|---|
| lotin harflari, raqamlar, `_` belgisi | nomni raqam bilan boshlash |
| `city`, `user_name`, `count2` | `2count`, `user-name`, nom ichida bo‘sh joy |

Katta va kichik harflar farqlanadi: `City` va `city` — turli o‘zgaruvchilar. O‘zgaruvchilarga tushunarli nom bering: nomidan unda nima saqlanayotgani aniq bo‘lsin.

## Klaviaturadan kiritish

`input()` funksiyasi foydalanuvchi satr kiritib Enter bosishini kutadi va kiritilgan matnni **qaytaradi**. Undan foydalanish uchun natija darhol o‘zgaruvchiga joylanadi.

Muhim: `input()` doim **satr** qaytaradi, hatto raqam kiritilgan bo‘lsa ham.

`input()` qavslari ichiga foydalanuvchi uchun izoh yozish mumkin, masalan «Ismingiz nima?». Avtomatik tekshiruvda izohlar chiqarilmaydi, shuning uchun ular xalaqit bermaydi.

## Ko‘p uchraydigan xatolar

| Xato | Nima bo‘ldi |
|---|---|
| `NameError: name '...' is not defined` | o‘zgaruvchi nomida xato bor yoki o‘zgaruvchiga hali qiymat berilmagan |
| `SyntaxError` | qo‘shtirnoq yoki qavs unutilgan |
| Chiqishda bo‘sh joy yo‘q | satrlarni ulashda bo‘sh joyni o‘zingiz qo‘shishingiz kerak |

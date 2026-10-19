## Mantiqiy tur bool

`bool` turining faqat ikkita qiymati bor: `True` (rost) va `False` (yolg‘on). Ular **katta** harf bilan va **qo‘shtirnoqsiz** yoziladi: qo‘shtirnoq ichidagi `"True"` — bu mantiqiy qiymat emas, balki satr.

## Taqqoslash

Taqqoslash natijasi — `bool` turidagi qiymat.

| Belgi | Ma’nosi | Misol | Natija |
|---|---|---|---|
| `>` | katta | `7 > 3` | `True` |
| `<` | kichik | `7 < 3` | `False` |
| `>=` | katta yoki teng | `3 >= 3` | `True` |
| `<=` | kichik yoki teng | `4 <= 3` | `False` |
| `==` | teng | `3 == 3` | `True` |
| `!=` | teng emas | `3 != 3` | `False` |

`=` va `==` ni adashtirmang: bitta «teng» belgisi qiymatni o‘zgaruvchiga joylaydi, ikkitasi esa taqqoslaydi.

Taqqoslash natijasini, har qanday qiymat kabi, **o‘zgaruvchiga saqlash**, keyin chiqarish yoki boshqa joyda ishlatish mumkin. Buning uchun `if` kerak emas: taqqoslashning o‘zi `True` yoki `False` beradi.

Bir xil turdagi qiymatlarni taqqoslash kerak. `"20"` satri va `20` soni — turli narsalar: `"20" == 20` natijasi `False`. Shuning uchun kiritilgan sonlar avval `int()` funksiyasi bilan o‘zgartiriladi.

## type() funksiyasi

`type()` funksiyasi qiymat turini ko‘rsatadi. Uning natijasi `print()` orqali chiqarilsa, ekranda `<class 'tur_nomi'>` ko‘rinishidagi yozuv paydo bo‘ladi:

| Qiymat | Uning type() si uchun print() nima chiqaradi |
|---|---|
| `42` | `<class 'int'>` |
| `2.5` | `<class 'float'>` |
| `"42"` | `<class 'str'>` |
| `3 > 1` | `<class 'bool'>` |

O‘zgaruvchida nima — satrmi yoki sonmi — noaniq bo‘lsa, `type()` dan foydalanish qulay.

## Mavzu yakuni: ma’lumot turlari

| Tur | Nimani saqlaydi | Kiritilgan ma’lumotdan qanday olinadi |
|---|---|---|
| `str` | matn | `input()` allaqachon satr qaytaradi |
| `int` | butun son | `int(...)` |
| `float` | kasr son | `float(...)` |
| `bool` | rost / yolg‘on | taqqoslash natijasi |

## Kasr sonlar

Narx, og‘irlik, bo‘y — bular kasr sonlar, `float` turi. Kiritilgan satr `float()` funksiyasi bilan kasr songa aylantiriladi. U kasr qismi bo‘lmagan yozuvni ham tushunadi: `"7"` satridan `7.0` hosil bo‘ladi.

Ifodada `int` va `float` birga kelsa, natija `float` bo‘ladi: butun `3` ni `1.5` ga ko‘paytirsak, `4.5` chiqadi.

## Kasr sonlarning noaniqligi

Kompyuter kasr sonlarni ikkilik ko‘rinishda saqlaydi, shuning uchun ularning ba’zilari noaniq saqlanadi. Masalan, Python’da `0.1 + 0.2` natijasi `0.30000000000000004`. Bu dasturingizdagi xato emas — deyarli barcha tillarda kasr sonlar shunday ishlaydi. Shuning uchun pul va boshqa «yaxlit» qiymatlar chiqarishda kerakli belgilar soniga **formatlanadi**.

## Yaxlitlash va formatlash

| Usul | Nima qiladi | Misol | Natija |
|---|---|---|---|
| `round(x, 2)` | sonni 2 xonagacha yaxlitlaydi | `round(3.14159, 2)` | `3.14` |
| `round(x)` | butun songacha yaxlitlaydi | `round(2.7)` | `3` |
| `:.2f` bilan f-satr | sonni **aynan** 2 xonali satrga aylantiradi | `x = 2.5` uchun `f"{x:.2f}"` satri | `2.50` |

`round()` ortiqcha xonalarni olib tashlaydi, lekin nol qo‘shmaydi: `round(2.5, 2)` natijasi `2.5` bo‘lib qoladi. Nuqtadan keyin aynan ikki xona kerak bo‘lsa (`2.50`), formatlashdan foydalaning.

**f-satr** — qo‘shtirnoqdan oldin `f` harfi yozilgan satr. Uning ichida jingalak qavslar `{}` orasiga o‘zgaruvchi nomi yoki ifoda yozish mumkin — uning qiymati matnga qo‘yiladi. Ikki nuqtadan keyin format ko‘rsatiladi: `.2f` «nuqtadan keyin ikki xonali kasr son» degani. Shu tarzda bitta satrda ham matn, ham sonni jamlash mumkin.

## Foizlar

Sonning p foizi — bu son × p / 100. p % chegirmali narx — narxdan chegirma ayirilgani, ya’ni narx × (100 − p) / 100.

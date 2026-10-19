# Льготы на платные приёмы.
# Приём бесплатный, если пациенту 65 лет и больше или у него есть инвалидность.
# В каждой строке — номер карты, возраст, инвалидность (да/нет) и цена приёма.


AGE = 65


def has_benefit(age, disability):
    return age >= AGE and disability == "да"


def main():
    n = int(input())
    total = 0
    free = 0
    for _ in range(n):
        card, age, disability, price = input().split()
        age = int(age)
        price = int(price)
        if has_benefit(age, disability):
            free += 1
            print(f"{card}: бесплатно")
        else:
            total += price
            print(f"{card}: к оплате {price}")
    print(f"Бесплатных приёмов: {free}")
    print(f"Касса получит: {total}")


main()

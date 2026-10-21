
def main():
    n = int(input())
    total_pay = 0

    for _ in range(n):
        order_id, amount = input().split()
        amount = int(amount)

        if amount >= 5000000:
            discount = 10
        elif amount >= 2000000:
            discount = 5
        else:
            discount = 0

        pay = amount - amount * discount // 100
        total_pay += pay

        print(f"{order_id}: {amount} - {discount}% = {pay}")

    print(f"Всего к оплате: {total_pay}")


main()


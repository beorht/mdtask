def count_calls(func):
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

@count_calls
def square(x):
    return x * x

n = int(input())
for _ in range(n):
    print(square(int(input())))
print(f"Вызовов: {square.calls}")

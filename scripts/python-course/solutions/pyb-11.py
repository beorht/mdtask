import random
import string

def generate_password(length):
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ""
    for _ in range(length):
        password += random.choice(alphabet)
    return password

random.seed(int(input()))
print(generate_password(int(input())))

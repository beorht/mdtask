import os
from dotenv import load_dotenv

load_dotenv()
print(f"Город: {os.getenv('DEFAULT_CITY', 'не задан')}")
print(f"Отладка: {'да' if os.getenv('DEBUG') == 'true' else 'нет'}")
key = os.getenv("API_KEY")
print(f"Ключ: {key[:3]}***" if key else "Ключ: нет")

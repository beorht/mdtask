from datetime import datetime, timedelta

DAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
d = datetime.strptime(input(), "%d.%m.%Y")
print(DAYS[d.weekday()])
print((d + timedelta(days=100)).strftime("%d.%m.%Y"))

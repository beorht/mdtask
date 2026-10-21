import sys

def main():
    try:
        n_line = input()
        if not n_line:
            return
        n = int(n_line.strip())
        
        issued_count = 0
        refused_count = 0
        
        for _ in range(n):
            line = input().strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 3:
                reader = parts[0]
                books_on_hands = int(parts[1])
                debt = int(parts[2])
                
                # Проверяем условия выдачи книги
                if debt > 0:
                    print(f"{reader}: отказать (долг {debt})")
                    refused_count += 1
                elif books_on_hands >= 5:
                    print(f"{reader}: отказать (на руках уже 5)")
                    refused_count += 1
                else:
                    print(f"{reader}: выдать")
                    issued_count += 1
                    
        print(f"Выдано: {issued_count}, отказано: {refused_count}")
        
    except Exception:
        pass

if __name__ == "__main__":
    main()
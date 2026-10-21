import sys

def main():
    try:
        first_line = input()
        if not first_line:
            return
        n = int(first_line.strip())
        
        books = []
        for _ in range(n):
            line = input().strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 3:
                reader = parts[0]
                cipher = parts[1]
                status = parts[2]
                
                # We can store records for all readers or just process target reader at the end
        # Actually, it's better to store all operations or process per reader.
    except Exception:
        pass
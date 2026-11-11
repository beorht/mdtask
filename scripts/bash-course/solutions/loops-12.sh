n=1
while IFS= read -r line; do
  echo "$n: $line"
  n=$((n + 1))
done < data.txt

n=1
for a in "$@"; do
  echo "$n: $a"
  n=$((n + 1))
done

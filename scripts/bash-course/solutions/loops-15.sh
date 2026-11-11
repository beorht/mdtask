sum=0
for n in "$@"; do
  if [ $((n % 2)) -eq 0 ]; then
    sum=$((sum + n))
  fi
done
echo "$sum"

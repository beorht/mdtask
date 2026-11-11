max=$1
for n in "$@"; do
  if [ $n -gt $max ]; then
    max=$n
  fi
done
echo "$max"

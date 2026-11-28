#!/bin/bash
# Phase 20B: runs tests/browser-env12.test.js N times and records each result. LOAD=k starts k busy CPU loops for the
# whole run (heavy-load condition). Output: one line per run, then a total.
cd "$(dirname "$0")/.." || exit 1
N=${1:-30}; LOAD=${LOAD:-0}; OUT=${OUT:-docs/audit20b/hatchery-runs.txt}
pids=(); for i in $(seq 1 "$LOAD"); do node -e 'for(;;){}' & pids+=($!); done
echo "# browser-env12, $N runs, busy loops: $LOAD, cores: $(nproc), $(date -u +%FT%TZ)" >> "$OUT"
pass=0; fail=0
for i in $(seq 1 "$N"); do
  r=$(node tests/browser-env12.test.js 2>&1 | grep -E "passed, [0-9]+ failed|not ok" | tr '\n' ' ')
  if echo "$r" | grep -q "10 passed, 0 failed"; then pass=$((pass+1)); else fail=$((fail+1)); fi
  echo "run $i: $r" >> "$OUT"
done
for p in "${pids[@]}"; do kill "$p" 2>/dev/null; done
echo "total: $pass passed, $fail failed (busy loops $LOAD)" >> "$OUT"
git checkout -- docs/ui/screens15d/status-chips.png 2>/dev/null

```bash
cd /home/user/calculator
python3 - <<'PY'
p = ".gitea/workflows/ci.yml"
s = open(p).read()
s = s.replace("      - name: Build\n", "      - name: Run tests\n        run: make test\n      - name: Build\n")
open(p, "w").write(s)
PY
git commit -am "Run the tests in CI" && git push

cat >> tests/test_calc.py <<'END'


def test_multiply():
    assert calc.multiply(3, 4) == 13
END
git commit -am "Add a multiply test" && git push      # this run fails at Run tests

sed -i 's/== 13/== 12/' tests/test_calc.py
git commit -am "Fix the expected multiply result" && git push      # this run passes
```

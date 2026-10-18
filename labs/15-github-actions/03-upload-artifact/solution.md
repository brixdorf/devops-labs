```bash
cd /home/user/calculator
cat >> .gitea/workflows/ci.yml <<'END'
      - name: Upload the build
        uses: actions/upload-artifact@v7
        with:
          name: calculator
          path: dist/calculator.pyz
END
git commit -am "Upload the build as an artifact" && git push
```

After the run succeeds:

```bash
mkdir -p /home/user/artifact && cd /home/user/artifact
api={{GITEA_URL}}/api/v1/repos/{{GITEA_USER}}/calculator/actions/artifacts
id=$(curl -s -u {{GITEA_USER}}:'{{GITEA_PASSWORD}}' "$api" | jq '[.artifacts[] | select(.name=="calculator")][0].id')
curl -s -L -u {{GITEA_USER}}:'{{GITEA_PASSWORD}}' -o calculator.zip "$api/$id/zip"
unzip -o calculator.zip
python3 calculator.pyz 6 x 7 > result.txt
cat result.txt     # 42
```

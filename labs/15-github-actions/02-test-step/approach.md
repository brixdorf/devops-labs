1. Edit `.gitea/workflows/ci.yml`, add the `Run tests` step, commit and push. Check that the run passes.
2. Append the wrong test, commit and push. Open the run: `Run tests` is red and `Build` is skipped.
3. Change 13 to 12, commit and push. The next run is green.

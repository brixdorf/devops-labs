## Objective

A pipeline is only useful if it stops bad changes. In this lab you add an automated test step to an existing workflow, then prove both sides: a failing test makes the workflow fail, and the corrected test makes it pass again.

- Gitea: {{GITEA_URL}}, username `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/calculator` is cloned to `/home/user/calculator` (credentials saved).
- It already has `.gitea/workflows/ci.yml` with checkout, install and build steps. `make test` runs the tests in `tests/` with pytest.

## Tasks

### Task 1: Add the test step

Add a step named `Run tests` that runs `make test`. It must run **after** the dependencies are installed and **before** the build. Commit and push.

### Task 2: Show that a failing test fails the workflow

Add this test to `tests/test_calc.py`, which is deliberately wrong:

```python
def test_multiply():
    assert calc.multiply(3, 4) == 13
```

Commit and push it. The run must fail at the `Run tests` step, and the `Build` step must not run.

### Task 3: Show that the corrected test passes

Fix the expected value to `12`, commit and push. The new run must succeed.

## Notes

- Push each change separately, so each one gets its own run.
- Watch the runs in the repository's **Actions** tab.

## Expected outcome

The workflow has a test step, one run failed because of the wrong test (without building), and the latest run on `main` passed with the corrected test.

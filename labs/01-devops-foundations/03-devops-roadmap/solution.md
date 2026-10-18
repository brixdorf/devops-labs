```bash
cd /home/user/roadmap
cat > roadmap.md <<'END'
# DevOps Roadmap

Plan for PixelPost, in the order the team should adopt each practice.

1. Version control: move the code to Git so every change is tracked, reviewed and reversible
2. Automated tests: run tests on every change so bugs are caught before users see them
3. Containerization: package the app in a container so it runs the same on every machine
4. CI/CD: build, test and deploy automatically from Git instead of copying files by hand
5. Monitoring: watch errors and uptime so the team learns about outages before users do
END
```

The reasons are shuffled for every lab session, so match them by meaning:

| Practice | Best reason |
| --- | --- |
| Version control | Every change is tracked, can be reviewed and can be undone |
| Automated tests | Bugs are caught on every change, before a release |
| Containerization | The app runs the same way on every laptop and server |
| CI/CD | Releases happen automatically and repeatably, not by hand on Friday evenings |
| Monitoring | The team learns about outages before users report them |

Then write `reasons-answer.txt`, for example `P1=R6` (use your own IDs).

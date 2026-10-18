## Scenario

PixelPost is a team of four developers who build a photo-sharing web app. They still deploy manually: code lives in a shared folder, nobody runs tests before a release, the app only works on the senior developer's laptop setup, releases are copied to the server by hand on Friday evenings, and nobody notices outages until users complain.

You are asked to write a one-page DevOps roadmap that tells the team what to adopt first and why. The team description and a list of possible reasons are in `/home/user/roadmap/`:

- `team.md` describes the team.
- `practices.txt` lists five practices with IDs `P1` to `P5`.
- `reasons.txt` lists short reasons with IDs `R1`, `R2`, ... Some reasons do not fit any practice.

## Tasks

### Task 1: Write the roadmap

Create `/home/user/roadmap/roadmap.md` with:

1. A first line that is exactly the heading `# DevOps Roadmap`.
2. A numbered list with exactly five steps, one per practice, in this priority order: version control, automated tests, containerization, CI/CD, monitoring.
3. Each step written as `<number>. <practice>: <reason>`, where the reason is your own short explanation of at least six words, for example:

```
1. Version control: every change is tracked and can be reviewed or reverted
```

### Task 2: Match practices to reasons

Create `/home/user/roadmap/reasons-answer.txt` that gives the best reason for each practice, one line per practice, in the form `P1=R4`. All five practices must be listed.

## Notes

- The practice names in your numbered list must clearly name each practice, for example "Version control", "Automated tests", "Containerization", "CI/CD" and "Monitoring".
- Other text, such as a short introduction, may appear between the heading and the list.

## Expected outcome

A one-page roadmap with five prioritized steps and reasons, and every practice matched to its best reason.

## Objective

BookNest is a small online bookstore. Today a developer builds the app on a laptop, copies it to the server by hand and checks the website manually after each release. The team wants a simple CI/CD workflow that takes every code commit all the way to production, automatically.

Your job is to describe that workflow in three small text files. The scenario and a list of activities are in `/home/user/cicd/`:

- `scenario.md` describes BookNest and how it is released today.
- `activities.md` lists eight activities, each with an ID such as `A1`.

## Tasks

### Task 1: Order the stages

Create `/home/user/cicd/pipeline.txt` with the six workflow stages in the order they run, one per line, using exactly these names:

`build`, `commit`, `deploy`, `monitor`, `package`, `test`

### Task 2: Draw the workflow

Create `/home/user/cicd/diagram.txt` containing a single line that draws the workflow as a flow from left to right, with ` -> ` between stages. For example, a two-stage flow would be:

```
first -> second
```

### Task 3: Label the activities

Create `/home/user/cicd/activities.txt` that assigns every activity in `activities.md` to the stage it belongs to. Use one line per activity, in the form `ID=stage`, for example:

```
A1=build
```

All eight activities must be listed, and each stage name must be one of the six names from Task 1.

## Notes

- File names and stage names are lowercase.
- Password for sudo, if you ever need it: `user@123!`

## Expected outcome

Three files in `/home/user/cicd/`: the stages in order, a one-line diagram of the flow, and every activity labelled with its stage.

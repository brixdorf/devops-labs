Stages and diagram:

```bash
cd /home/user/cicd
printf '%s\n' commit build test package deploy monitor > pipeline.txt
echo 'commit -> build -> test -> package -> deploy -> monitor' > diagram.txt
```

The activity IDs are shuffled in every lab session, so match each activity by its text:

| Activity | Stage |
| --- | --- |
| Developer pushes a change to the main branch | commit |
| Install dependencies and compile the source code | build |
| Run the unit tests | test |
| Run integration tests against a test database | test |
| Create a versioned container image and push it to the registry | package |
| Roll the new image out to the production servers | deploy |
| Watch the error rate and latency dashboards | monitor |
| Alert the on-call engineer when the site returns errors | monitor |

Then write one line per activity with the IDs from your `activities.md`, for example:

```bash
nano activities.txt      # A1=test, A2=deploy, ... one per line
cat activities.txt
```

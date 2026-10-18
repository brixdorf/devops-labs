## Objective

Every `helm install`, `helm upgrade` and `helm rollback` creates a new **revision** of a release, and Helm keeps the history. That makes upgrades safe: if one goes wrong, you roll back to a known good revision with one command. You will upgrade a release, inspect its history and roll back.

The release `catalog` is already installed in the `catalog` namespace from the chart in `/home/user/charts/catalog` (revision 1). It runs one replica of `{{IMAGE_PODINFO_PREVIOUS}}`.

## Tasks

### Task 1: Inspect the release

Look at the release status, its values and its history.

### Task 2: Upgrade

Upgrade `catalog` (from the same chart) so that it runs:

- image tag: the tag of `{{IMAGE_PODINFO}}`
- `replicaCount`: `2`

This creates revision 2. Wait until it is rolled out.

### Task 3: Inspect the history

Save the output of `helm history catalog -n catalog` to `/home/user/charts/history-after-upgrade.txt`.

### Task 4: Roll back

Roll the release back to **revision 1**. Wait until the Deployment is back to one replica of the old version.

### Task 5: Verify the final state

Save `helm history catalog -n catalog` again to `/home/user/charts/history-after-rollback.txt` and `helm status catalog -n catalog` to `/home/user/charts/final-status.txt`.

## Notes

- Use `--set` or a values file for the upgrade. Keep the image repository unchanged.
- A rollback does not delete revision 2; it creates revision 3 with the contents of revision 1.

## Expected outcome

Release `catalog` is at revision 3 (a rollback to 1), status `deployed`, running one replica of the old image, with the history showing all three revisions.

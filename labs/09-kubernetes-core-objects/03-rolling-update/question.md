## Objective

Deployments update applications without downtime: a **rolling update** replaces old Pods with new ones a few at a time. If the new version misbehaves, a **rollback** returns to the previous version just as smoothly. You will deploy version 1 of an application, roll out version 2, verify it, and roll back to version 1.

The application is podinfo. Its two versions are these images:

- version 1: `{{IMAGE_PODINFO_PREVIOUS}}`
- version 2: `{{IMAGE_PODINFO}}`

## Tasks

### Task 1: Deploy version 1

Create a Deployment named `catalog` with `3` replicas, image `{{IMAGE_PODINFO_PREVIOUS}}` and a container named `podinfo`. Wait until it is ready.

### Task 2: Roll out version 2

Update the `podinfo` container of `catalog` to `{{IMAGE_PODINFO}}`. Watch the rollout until it completes.

### Task 3: Verify version 2

Confirm that all Pods run the new image. Save the output of `kubectl rollout history deployment/catalog` to `/home/user/rollout/history-after-update.txt`.

### Task 4: Roll back

Roll `catalog` back to the previous revision and wait until the rollback is complete.

### Task 5: Record the result

Save `kubectl rollout history deployment/catalog` again to `/home/user/rollout/history-after-rollback.txt`, and create `/home/user/rollout/result.txt` with:

```
current_image=<image the Deployment uses now>
revisions=<number of revisions shown in the history now>
```

## Notes

- The `rollout` folder does not exist yet.
- A rollback creates a new revision: the old revision number moves to the top of the history.

## Expected outcome

`catalog` runs version 1 again with 3 ready Pods, after a completed rollout to version 2, and the history files show the revisions.

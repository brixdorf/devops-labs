## Objective

A Pod's own file system is thrown away when the Pod is deleted. To keep data, a Pod mounts a volume backed by a **PersistentVolumeClaim** (PVC), which asks the cluster for storage. The cluster's default storage class, `local-path`, provisions it automatically. You will write a file to such a volume, recreate the Pod, and check that the file is still there.

## Tasks

### Task 1: Request storage

Create a PersistentVolumeClaim:

- name: `notes-pvc`
- access mode: `ReadWriteOnce`
- size: `1Gi`
- storage class: `local-path`

### Task 2: Mount it in a Pod

Write `/home/user/storage/pod.yaml` with a Pod:

- name: `notes-writer`
- image: `{{IMAGE_BUSYBOX}}`, command `sleep 3600`
- the claim `notes-pvc` mounted at `/data`

Create the Pod and wait until it is running. The claim becomes `Bound` once the Pod uses it.

### Task 3: Write a file

Write the text `Persistent storage works` to `/data/notes.txt` inside the Pod.

### Task 4: Recreate the Pod

Delete the Pod `notes-writer`, then create it again from the same `pod.yaml`.

### Task 5: Verify

Read `/data/notes.txt` in the new Pod and save its contents to `/home/user/storage/after-recreate.txt`.

## Notes

- Leave the new Pod running when you submit.

## Expected outcome

A bound PVC `notes-pvc`, and a recreated Pod `notes-writer` that still finds the file written by the old Pod.

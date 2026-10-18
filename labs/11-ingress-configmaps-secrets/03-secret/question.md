## Objective

Passwords must never be written into Deployment manifests, which end up in Git. Kubernetes **Secrets** keep them separate, and Pods reference them by name. You will store a database credential in a Secret and consume it from a Pod, both as environment variables and as a mounted file.

The database password for this lab is in `/home/user/secret/db-password.txt`.

## Tasks

### Task 1: Create the Secret

Create a Secret of type `Opaque` named `db-credentials` with two keys:

- `username`: `appuser`
- `password`: the contents of `/home/user/secret/db-password.txt` (without a trailing newline)

### Task 2: Write the Deployment manifest

Create `/home/user/secret/app.yaml` with a Deployment named `secret-demo` (image `{{IMAGE_BUSYBOX}}`, container name `app`, command `sleep 3600`) that:

- sets the environment variable `DB_USER` from the Secret key `username`
- sets the environment variable `DB_PASSWORD` from the Secret key `password`
- mounts the whole Secret as a read-only volume at `/etc/db-credentials`

The manifest must **not** contain the password, in plain text or in base64.

### Task 3: Deploy and verify

Apply the manifest and wait for the Pod. Verify inside the Pod that `DB_PASSWORD` and the file `/etc/db-credentials/password` both contain the password.

## Notes

- Base64 is an encoding, not encryption: anyone who can read a Secret object can decode it. Keeping it out of manifests and Git is what matters here.

## Expected outcome

The `secret-demo` Pod gets the credential from `db-credentials` as environment variables and as files, and `app.yaml` contains no copy of the password.

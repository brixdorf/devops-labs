1. Create the Secret, then check it with `kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d`.
2. Write `app.yaml` with `secretKeyRef` for both variables and a `secret` volume mounted at `/etc/db-credentials`.
3. `grep` your manifest for the password to make sure it is not there.
4. Apply it and check with `kubectl exec deploy/secret-demo -- sh -c 'echo $DB_PASSWORD; cat /etc/db-credentials/password'`.

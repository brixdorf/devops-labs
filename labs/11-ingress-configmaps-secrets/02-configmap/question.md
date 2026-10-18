## Objective

Configuration belongs outside the container image, so the same image can run in every environment. A **ConfigMap** holds non-secret settings, and Pods can receive them as environment variables. You will create a ConfigMap, inject it into a Deployment, and verify the values inside a running Pod.

## Tasks

### Task 1: Create the ConfigMap

Create a ConfigMap named `app-config` with these keys:

| Key | Value |
| --- | --- |
| `APP_COLOR` | `teal` |
| `APP_MODE` | `staging` |
| `MAX_UPLOAD_MB` | `25` |

### Task 2: Inject it into a Deployment

Create a Deployment named `config-demo` with image `{{IMAGE_BUSYBOX}}`, container name `app` and the command `sleep 3600`, that receives **all keys** of `app-config` as environment variables. Do not write the values themselves into the Deployment.

### Task 3: Verify inside the Pod

When the Pod is running, list its environment variables and save the three values to `/home/user/config-check.txt`, for example:

```
kubectl exec deploy/config-demo -- env | grep -E 'APP_|MAX_' | sort > /home/user/config-check.txt
```

## Notes

- Use `envFrom` with `configMapRef` (all keys) or one `valueFrom.configMapKeyRef` per key. Both take the values from the ConfigMap.

## Expected outcome

The running `config-demo` Pod has `APP_COLOR=teal`, `APP_MODE=staging` and `MAX_UPLOAD_MB=25` from the ConfigMap, and the saved file shows them.

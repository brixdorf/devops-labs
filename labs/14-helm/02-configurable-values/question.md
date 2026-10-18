## Objective

The same chart deploys to every environment; only the **values** change. A chart for the storefront is in `/home/user/charts/shop`. Its templates read `image.repository`, `image.tag`, `replicaCount` and `service.port`. You will write a values file for production, check what it renders, install the release and verify the resources it created.

## Tasks

### Task 1: Write the values file

Create `/home/user/charts/prod-values.yaml` that sets:

- `image.repository` and `image.tag` so the image is `{{IMAGE_NGINX}}`
- `replicaCount`: `3`
- `service.port`: `8080`

Do not edit the chart itself.

### Task 2: Check the rendered manifests

Render the chart with your values file and save the output to `/home/user/charts/rendered.yaml`. Check that it shows the image, `replicas: 3` and `port: 8080`.

### Task 3: Install the release

Install the chart as a release named `shop` in the namespace `shop` (create the namespace with the install command), using your values file.

### Task 4: Verify the installed resources

Confirm that the Deployment `shop` has 3 ready replicas with the right image and that the Service `shop` listens on port `8080`. Save the output of `helm get values shop -n shop` to `/home/user/charts/installed-values.txt`.

## Notes

- `helm template` renders without installing; `helm install --dry-run` does the same against the cluster.

## Expected outcome

Release `shop` is deployed in namespace `shop` from your values file, with 3 replicas of the pinned image behind a Service on port 8080.

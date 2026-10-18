## Objective

Helm packages Kubernetes manifests as a **chart**: templates with placeholders, default values for those placeholders, and metadata. You will create a chart for a simple web application, adjust it, check that it renders valid manifests, and explain what its main parts are for.

## Tasks

### Task 1: Create the chart

In `/home/user/charts`, create a new chart named `webapp` with `helm create`.

### Task 2: Set the metadata

Edit `/home/user/charts/webapp/Chart.yaml`:

- `description`: `A simple web application`
- `version`: `0.2.0`
- `appVersion`: `"1.0.0"`

### Task 3: Set the default values

Edit `/home/user/charts/webapp/values.yaml` so the chart deploys `{{IMAGE_NGINX}}` by default:

- `image.repository`: the part before the colon
- `image.tag`: the part after the colon
- `replicaCount`: `2`

### Task 4: Check the chart

The chart must pass `helm lint`, and `helm template` must render a Deployment that uses the image above. Save the rendered manifests to `/home/user/charts/webapp-rendered.yaml`.

### Task 5: Explain the parts

`/home/user/charts/parts.txt` lists numbered descriptions (`D1`, `D2`, ...). Create `/home/user/charts/purpose.txt` that names the right description for each part:

```
Chart.yaml=<description ID>
values.yaml=<description ID>
templates=<description ID>
```

## Notes

- You do not need to install the chart in this lab.

## Expected outcome

A lint-clean chart `webapp` with your metadata and defaults, its rendered output, and a correct explanation of Chart.yaml, values.yaml and the templates directory.

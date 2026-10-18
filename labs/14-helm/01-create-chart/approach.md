1. Create the chart with `helm create`.
2. Edit `Chart.yaml` and `values.yaml` with `nano`.
3. Run `helm lint ./webapp` until it reports no failures.
4. Render with `helm template` and check the `image:` line of the Deployment.
5. Read `parts.txt` and write `purpose.txt`.

1. Inspect the deployment's container ports.
2. Write a Service manifest with `port: 8080` and `targetPort: http`, then apply it.
3. Run a temporary busybox Pod with `wget -qO- http://payments-svc:8080/version` and save the output.
4. Look at the endpoints: the port there is 9898, the resolved target. Write `port-mapping.txt`.

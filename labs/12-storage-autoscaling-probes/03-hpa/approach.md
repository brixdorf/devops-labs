1. Write the Deployment with resources and the Service, apply them.
2. Create the HPA with `kubectl autoscale` or an `autoscaling/v2` manifest.
3. Start the load generator and watch the HPA. `kubectl describe hpa cpu-app-hpa` explains what it is doing.
4. Save the HPA line once a percentage shows.
5. Think about which components and settings the HPA used to compute that percentage, then pick the two statements.

1. Create the namespace and the deployment.
2. Wait with `kubectl rollout status`.
3. `mkdir -p /home/user/inspect`, then run the three commands with `>` redirection.
4. Read the files: `describe.txt` lists the image and replicas, `pods.txt` shows the node, and `logs.txt` shows the startup messages, including the port.
5. Write `summary.txt`.

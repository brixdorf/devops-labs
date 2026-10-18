1. Create the deployment.
2. Write a Service manifest with `type: NodePort` and `nodePort: 30080`, and apply it.
3. `curl http://k3s:30080/` and save the output.
4. Find the node IP and write `nodeport.txt`, then test the URL you wrote with `curl`.

1. Read `components.txt` and `roles.txt`, and match each component to the role that only it performs.
2. Decide for each component whether it is part of the control plane, runs on every node, or runs on your machine.
3. Read `steps.txt`. The flow always starts at the client and ends on the node; the API server stores every change before anyone acts on it.
4. Use `kubectl config view --minify` and `kubectl get nodes -o wide` for `live.txt`.

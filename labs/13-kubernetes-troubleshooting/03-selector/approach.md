1. Look at the Pod labels and the Service selector side by side: one character differs.
2. Count the endpoints (none) and write `diagnosis.txt`.
3. Patch the Service's selector to match the Pod label.
4. Check the endpoints again and test with a temporary busybox Pod.

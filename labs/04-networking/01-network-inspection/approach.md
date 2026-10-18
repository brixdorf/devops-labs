1. Run `ip a` and find the interface other than `lo`. Note its name, address and prefix length.
2. Run `ip route` and note the address after `default via`.
3. Run `ss -tln` and collect the port numbers from the "Local Address:Port" column. Sort them.
4. Write `network-report.txt` and `commands.txt` with `nano`.
5. Read `questions.txt`, think about what each value means, and write `interpretation.txt`.

In this assignment, you will practice basic Linux commands. For each task, you must store your answer in a file named `answer.txt` using the `echo` command.

After completing all tasks, click the **Run Task And Submit** button to test your answers.

### Important Note

In the question, we are using the `echo` command. It is commonly used in shell scripts and command-line operations to output text to the terminal or write text to a file.

General format:

```
echo <value> >> /home/user/answer.txt
```

Replace `<value>` with the required answer.

### TASK 1: Find Current Directory

Run a command to display your current working directory. Copy the output shown in the terminal. Store that output in `answer.txt`.

Example: if the command returns `/var/lib`, then store it as:

```
echo /var/lib >> /home/user/answer.txt
```

### TASK 2: Change Directory

A directory named `task_1` exists in your current location. Use a Linux command to move into the `task_1` directory. Store only the command name (not the full command or path) in `answer.txt`.

Example: `echo <cmd_name> >> /home/user/answer.txt`

### TASK 3: List Directory Contents

Inside the `task_1` directory, use a Linux command to list files and directories. Store only the command name in `answer.txt`.

Example: `echo <cmd_name> >> /home/user/answer.txt`

### TASK 4: Find Hidden File

There is a hidden file inside the `task_1` directory. Use the command with appropriate flags to display hidden files. Identify the hidden file. Store only the file name (not the command) in `answer.txt`.

Example: `echo <hidden_file_name> >> /home/user/answer.txt`

### Final Notes

- Run Task 1 from the directory the terminal opens in.
- For Task 2 and Task 3, store only the command name.
- Do not include extra spaces or text.
- Make sure all answers are appended to the same file, `/home/user/answer.txt`, one per line and in task order.

### Expected outcome

`/home/user/answer.txt` contains exactly four lines: the working directory, the command that changes directory, the command that lists a directory, and the hidden file's name.

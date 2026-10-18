## Objective

You are tasked with creating your first shell script that follows company standards for structure and documentation. This exercise will help you practice script creation, permissions, shebang usage, and adding proper documentation for maintainability.

## Instructions

1. **Create the Script File:** create an empty file named `system_info.sh` in your home directory (`~/`, which is `/home/user`).
2. **Make it Executable:** modify the file's permissions so it can be executed as a program.
3. **Add the Shebang:** at the very top of the script, add the correct shebang line to specify the bash interpreter.
4. **Add Documentation:** include header comments in the script with the following fields, each on its own line and each with a value:
   - `Author:`
   - `Version:`
   - `Description:`
5. **Add a Command:** insert a simple command that prints `System Information Report`.

## Important Notes

- The shebang must always be the first line of the script.
- Use `chmod` to make the file executable.
- Header comments should start with `#` and clearly describe the script, for example `# Author: Jane Doe`.
- Keep the script simple, clean, and easy to read for other team members.
- The checker runs the script as `./system_info.sh` from your home directory, so the execute permission matters.

## Outcome

By completing this task, you will be able to:

- Create a properly structured shell script.
- Understand the importance of the shebang line.
- Apply correct file permissions for execution.
- Document scripts according to organizational standards.

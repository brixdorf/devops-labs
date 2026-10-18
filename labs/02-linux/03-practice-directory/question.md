## Lab Description

In this lab, your goal is to practice how Linux organizes information using directories and files. You will create a dedicated working folder and place specific files inside it. This exercise reinforces your understanding of how to create directories, move between them, generate empty files, and view them in a detailed listing format. The lab will also help you understand how to ensure your work is done inside the correct location, which is important for passing automated test cases.

## Tasks

1. Create a new folder named `practice` in your home directory, so its full path is `/home/user/practice`.
2. Enter this folder, because all subsequent work must happen inside it.
3. Create three files named `a.txt`, `b.txt` and `c.txt`. All of them must be empty files, and all of them must be located directly inside the `practice` folder.
4. Once the files are created, use a listing option that not only displays file names but also shows detailed information about each one, including permissions, ownership, size and timestamps. This detailed listing is necessary to confirm that the files exist in the correct directory and have been properly created. This step is only intended for practice and will not be verified by the automated test cases.

## Notes

- Password for sudo: `user@123!` (not needed for this lab).
- Ensure you enter the directory before creating the files.
- Verify your files using the long listing format from inside the `practice` directory.
- The files must belong to you (`user`), so do not use `sudo` to create them.

## Expected outcome

`/home/user/practice` contains exactly the empty files `a.txt`, `b.txt` and `c.txt`, owned by `user`.

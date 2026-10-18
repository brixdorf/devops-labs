## Objective

A colleague dumped the files of a small web service into `/home/user/incoming/`. You will build a clean project layout and practice the everyday file commands: listing, copying, moving, searching and deleting.

Start by looking around: `ls -R /home/user/incoming`.

## Tasks

### Task 1: Create the project layout

Create `/home/user/project` with three subdirectories: `app`, `logs` and `config`.

### Task 2: Copy the application

**Copy** `/home/user/incoming/app.py` into `/home/user/project/app/`. The original must stay in `incoming`.

### Task 3: Move the configuration

**Move** `/home/user/incoming/settings.conf` into `/home/user/project/config/`. It must no longer be in `incoming`.

### Task 4: Move every log file

Move **every** file whose name ends in `.log` from anywhere under `/home/user/incoming/` (including its subdirectories) into `/home/user/project/logs/`. Keep the original file names.

### Task 5: Search the logs

One of the log files contains the text `disk full`. Write only the **file name** of that log (for example `example.log`) into `/home/user/project/search-result.txt`.

### Task 6: Delete temporary files

Delete every file whose name ends in `.tmp` anywhere under `/home/user/incoming/`. Leave all other files in place.

### Task 7: Save a detailed listing

Save the output of a long listing (permissions, owner, size, date and name) of `/home/user/project/logs` into `/home/user/project/listing.txt`.

## Notes

- Work as `user`; you do not need `sudo`.
- Do not change the contents of any file you copy or move.

## Expected outcome

`/home/user/project` holds the app (copied), the config (moved), all logs (moved), a search result and a listing, and no `.tmp` files are left in `incoming`.

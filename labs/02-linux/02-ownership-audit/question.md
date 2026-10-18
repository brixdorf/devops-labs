## Problem: Ownership and Permission Audit for Sensitive Files

In a security-focused DevOps environment, managing file ownership is just as critical as managing file permissions.

You are tasked with correcting the ownership of files in a simulated secure log environment located at:

```
/home/user/task_8/
├── audit.log
└── confidential/
    ├── file1
    └── file2
```

Note: Use password `user@123!` if required for sudo access.

Initially, all files are owned by `root:root`. Your job is to update the ownership as follows:

1. The `audit.log` file must be owned by user `nobody` and group `nogroup` (`nobody:nogroup`).
2. All files inside the `confidential/` folder (`file1` and `file2`) must be owned by user `nobody`.

## Notes

- Change only the ownership. Do not delete, recreate or edit the files.
- Changing ownership of files you do not own needs `sudo`.

## Expected outcome

`audit.log` is owned by `nobody:nogroup`, and `confidential/file1` and `confidential/file2` are owned by `nobody`. The file contents are unchanged.

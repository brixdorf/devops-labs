```bash
pwd                                    # prints /home/user
echo /home/user >> /home/user/answer.txt

cd task_1
echo cd >> /home/user/answer.txt

ls
echo ls >> /home/user/answer.txt

ls -a                                  # shows the hidden file, for example .deploy_token
echo .deploy_token >> /home/user/answer.txt   # use the name you actually see

cat /home/user/answer.txt
```

The hidden file name is different in every lab session, so use the name `ls -a` shows you.

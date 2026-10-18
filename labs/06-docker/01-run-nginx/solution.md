```bash
docker run -d --name web -p 8080:80 nginx
docker ps
curl http://localhost:8080
docker logs web > /home/user/web-logs.txt 2>&1
cat /home/user/web-logs.txt
```

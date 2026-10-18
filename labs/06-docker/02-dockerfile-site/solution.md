```bash
cd /home/user/site
cat > Dockerfile <<'END'
FROM {{IMAGE_PYTHON}}
WORKDIR /srv/site
COPY index.html .
CMD ["python3", "-m", "http.server", "8000"]
END
docker build -t my-site:1.0 .
docker run -d --name site -p 8081:8000 my-site:1.0
curl http://localhost:8081
```

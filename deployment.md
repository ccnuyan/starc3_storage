# node

```
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
sudo apt-get install -y nodejs
```

# git

```
sudo apt-get install -y git
sudo git clone http://github.com/ccnuyan/starc3_oauth2
```

# build-essential

```
sudo apt-get install -y build-essential
```

# npm

```
sudo npm run itaobao
```

# api

```
docker rm -f storage-api
docker build -t storage-api:0.0.1 -f Dockerfile.api .
docker run -d -p 3200:3200 -v /root/source:/etc/source --name storage-api storage-api:0.0.1
docker logs -f storage-api
```

### node
    curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
    sudo apt-get install -y nodejs
### git
    sudo apt-get install -y git
    sudo git clone http://github.com/ccnuyan/starc3_oauth2
### build-essential
    sudo apt-get install -y build-essential
### npm
    sudo npm run itaobao
### api
    docker rm -f uploader-api
    docker build -t uploader-api:0.0.1 -f Dockerfile.api .
    docker run -d -p 3200:3200 --name uploader-api uploader-api:0.0.1
    docker logs -f uploader-api
### mongo
    docker run -d -p 27017:27017 mongo:3.2

FROM node:16

ENV MNT_POINT /var/s3fs
ARG S3FS_VERSION=v1.86

USER root
RUN apt-get update -y && apt-get install -y libfuse-dev
RUN apt-get install fuse automake autoconf libxml2-dev git bash; \
    git clone https://github.com/s3fs-fuse/s3fs-fuse.git; \
    cd s3fs-fuse; \
    git checkout tags/${S3FS_VERSION}; \
    ./autogen.sh; \
    ./configure --prefix=/usr; \
    make; \
    make install; \
    make clean; 

RUN mkdir -p "$MNT_POINT"

#
USER root
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package.json ./
COPY startup.sh ./
USER node
RUN npm install
COPY --chown=node:node . .

# ipfs
USER root
WORKDIR /home/ipfs
RUN wget https://dist.ipfs.tech/kubo/v0.15.0/kubo_v0.15.0_linux-amd64.tar.gz
RUN tar -xvzf kubo_v0.15.0_linux-amd64.tar.gz
WORKDIR /home/ipfs/kubo
RUN bash install.sh

# cli
WORKDIR /home/node/app
RUN chmod +x startup.sh
ENTRYPOINT ["./startup.sh"]

EXPOSE 80

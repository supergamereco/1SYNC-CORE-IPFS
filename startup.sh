#!/bin/sh
echo "$AWS_KEY:$AWS_SECRET_KEY" > passwd && chmod 600 passwd
s3fs "s3-nft1-dev-ipns-0xk" "$MNT_POINT" -o passwd_file=passwd
export IPFS_PATH=/var/s3fs
if [ -d ~/.ipfs ]; then sudo mv ~/.ipfs/* /var/s3fs ; rm -d ~/.ipfs ; else ipfs init; fi;
npm start & ipfs daemon

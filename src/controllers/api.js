const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const { createS3Repo } = require('../lib/create-s3-repo');
const { S3Lock } = require('../lib/s3-lock');

require('dotenv').config();

let node;
let errorMessage = {
    10001: 'Request body can not be empty',
    10002: 'Invalid parameter',
    10003: 'Could not write file',
    10004: 'Could not add IPFS record',
    10005: 'Could not publish IPNS',
    10006: 'File was not uploaded'
};

module.exports = class ApiController {
    /* Add new IPFS record and publish IPNS */
    async postIpns(request, response) {
        if (Object.keys(request.body).length === 0) {
            responseError(response, 400, 10001)
            return;
        }
        //read and check parameter
        const { app_id, contract_address, metadata } = request.body;
        if (!app_id || !contract_address || !metadata 
        || !metadata.token_id || !metadata.name || !metadata.description || !metadata.image || !metadata.attributes ) {
            responseError(response, 400, 10002);
            return;
        }
            
        await createNode();
        let result = await ipfsProcess(contract_address, metadata);

        let errorObject = {}
        if (!result.success) {
            errorObject = {
                code: result.code,
                message: errorMessage[result.code]
            }
        }

        response.status(200).send({
            success: result.success,
            error: errorObject,
            ipfs_cid: result.ipfs_cid,
            ipns_cid: result.ipns_cid,
        })
    }
    async postImageUpload(request, response) {
        //Check the uploaded file
        if (!request.files) {
            responseError(response, 400, 10006)
            return;
        }
        let file = request.files.image;
        await createNode();
        let ipfsResult = await ipfsAdd(file.data); //file.data is buffer
        let errorObject = {}
        if (!ipfsResult.success) {
            errorObject = {
                code: ipfsResult.code,
                message: errorMessage[ipfsResult.code]
            }
        }

        //ipfsAdded.cid.toString(),

        response.status(200).send({
            success: ipfsResult.success,
            error: errorObject,
            ipfs_cid: ipfsResult.cid,
        })
    }
    async postImageToken(request, response) {
        if (Object.keys(request.body).length === 0) {
            responseError(response, 400, 10001)
            return;
        }
        //read and check parameter
        const { app_id, contract_address, token_id } = request.body;
        if (!app_id || !contract_address || !token_id) {
            responseError(response, 400, 10002);
            return;
        }
        //Check the uploaded file
        if (!request.files) {
            responseError(response, 400, 10006)
            return;
        }
        let file = request.files.image;

        await createNode();
        let result = await imageProcess(contract_address, token_id, file.data); // file.data is buffer

        let errorObject = {}
        if (!result.success) {
            errorObject = {
                code: result.code,
                message: errorMessage[result.code]
            }
        }

        response.status(200).send({
            success: result.success,
            error: errorObject,
            ipfs_cid: result.ipfs_cid,
            ipns_cid: result.ipns_cid,
        })
    }
}
/* Create IPFS node service */
async function createNode() {
    const { create } = await import('ipfs-http-client');

    // Kept for future use (if we need to connect S3 via code)
    // const { S3Datastore } = await import('datastore-s3');
    // // Configure S3 as normal
    // const s3 = new S3({
    //     params: {
    //         Bucket: 'my-bucket'
    //     },
    //     accessKeyId: 'myaccesskey',
    //     secretAccessKey: 'mysecretkey'
    // })
    // const repoLock = new S3Lock(s3)
    // const s3Repo = createS3Repo('/', s3, repoLock)
    // node = await create({ url :'http://127.0.0.1:5001', repo: s3Repo })

    node = await create();
}
/* Process the ipfs request */
async function ipfsProcess(contractAddress, metadata) {
    // Note* We dont validate parameters because we already check them when we read request.body

    let keyName = `${contractAddress}_${metadata.token_id}`;
    let content = JSON.stringify(metadata);
    
    // Keep this for debug purpose
    // console.log(`${Date().toLocaleString()} ipfs request> token id:${tokenId} metadata:${content} `);
    
    // Keep this for future use (if when need to write local file)
    // let fileName = `${keyName}.json`;
    // if (!await writeFileContent(fileName, content))
    // {
    //     responseError(response, 500, 10003);
    //     return;
    // }

    let ipfsResult = await ipfsAdd(content);
    if (!ipfsResult.success) {
        return {
            'success':false,
            'code':10004,
            'message':ipfsResult.message
        };
    }

    let keys = await getIpnsKey(keyName);
    let ipnsResult = await ipnsPublish(ipfsResult.cid, keys.name);
    if (!ipnsResult.success){
        // responseError(response, 500, 10005)
        return {
            'success':false,
            'code':10005
        };
    }
    
    return {
        'success': true,
        'ipfs_cid': ipfsResult.cid,
        'ipfs_content': ipfsResult.added_content,
        'ipns_cid': ipnsResult.ipns_cid,
        'code': 200,
        'message': null
    }
}
/* Process the image request */
async function imageProcess(contractAddress, tokenId, fileContent) {
    // Note* We dont validate parameters because we already check them when we read request.body

    let keyName = `${contractAddress}_${tokenId}_image`;
    let ipfsResult = await ipfsAdd(fileContent);
    if (!ipfsResult.success) {
        return {
            'success':false,
            'code':10004,
            'message':ipfsResult.message
        };
    }

    let keys = await getIpnsKey(keyName);
    let ipnsResult = await ipnsPublish(ipfsResult.cid, keys.name);
    if (!ipnsResult.success){
        // responseError(response, 500, 10005)
        return {
            'success':false,
            'code':10005
        };
    }
    
    return {
        'success': true,
        'ipfs_cid': ipfsResult.cid,
        'ipfs_content': ipfsResult.added_content,
        'ipns_cid': ipnsResult.ipns_cid,
        'code': 200,
        'message': null
    }
}
/* Write metadata to json file */
async function writeFileContent(fileName, content) {
    let filePath = `./metadata/${fileName}`;
    fs.writeFile(filePath, content, function (err) {
        if (err)
            return false
    });
    return true;
}
/* Add ipfs record to network */
async function ipfsAdd(fileContent) {
    try {
        //IPFS add
        let ipfsAdded = await node.add({
            content: fileContent
        });
    
        //Get IPFS content
        const decoder = new TextDecoder()
        let addedContent = ''
        for await (const chunk of node.cat(ipfsAdded.cid)) {
            addedContent += decoder.decode(chunk, {
                stream: true
            })
        }
        return {
            'success': true,
            'cid': ipfsAdded.cid.toString(),
            'added_content': addedContent
        }
    } catch (error) {
        return {
            'success': false,
            'message': error.toString()
        }
    }
}
/* Get ipns key, create new if not exist */
async function getIpnsKey(keyName) {
    let keys
    if (keyName != "self") {
        //check for existing key, create one if not exist
        if (!(await node.key.list()).find((k) => k.name == keyName)) {
            keys = await node.key.gen(keyName, {
                type: 'ed25519'
            })
        } else {
            let r = await node.key.list();
            keys = r.find((k) => k.name == keyName);
        }
    }
    return keys
}
/* Publish ipns to ipfs cid */
async function ipnsPublish(ipfsCid, keyName) {
    try {
        let address = `/ipfs/${ipfsCid}`;
        let result = await node.name.publish(address, {
            resolve: false,
            key: keyName,
        });
        return {
            'success': true,
            'ipns_cid': result.name
        }
    } catch (error) {
        return {
            'success': false,
            'message': error.toString()
        }
    }
}
/* To response with error code */
function responseError(response, status, code) {
    response.status(status).send(
        {
            success: false,
            error: {
                code: code,
                message: errorMessage[code]
            }
        }
    );
}


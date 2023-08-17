

/**
 * @typedef {import('multiformats/codecs/interface').BlockCodec<any, any>} BlockCodec
 */

/**
 * A convenience method for creating an S3 backed IPFS repo
 *
 * @param {string} path
 * @param {import('aws-sdk/clients/s3')} s3
 * @param {import('ipfs-repo').RepoLock} repoLock
 */

const createS3Repo = async (path, s3, repoLock) => {

    const { S3Datastore } = await import('datastore-s3');
    const { BlockstoreDatastoreAdapter } = await import('blockstore-datastore-adaptere-s3');
    const { ShardingDatastore } = await import('datastore-core/sharding');
    const { NextToLast } = await import('datastore-core/shard');
    const { createRepo } = await import('ipfs-repo');
    const raw = await import('multiformats/codecs/raw');
    const json = await import('multiformats/codecs/json');
    const dagPb = await import('@ipld/dag-pb');
    const dagCbor = await import('@ipld/dag-cbor');

    const storeConfig = {
        s3,
        createIfMissing: true
    }

    /**
     * These are the codecs we want to support, you may wish to add others
     *
     * @type {Record<string | number, BlockCodec>}
     */
    const codecs = {
        [raw.code]: raw,
        [raw.name]: raw,
        [json.code]: json,
        [json.name]: json,
        [dagPb.code]: dagPb,
        [dagPb.name]: dagPb,
        [dagCbor.code]: dagCbor,
        [dagCbor.name]: dagCbor
    }

    /**
     * @type {import('ipfs-repo/src/types').loadCodec}
     */
    const loadCodec = async (codeOrName) => {
        if (codecs[codeOrName]) {
            return codecs[codeOrName]
        }

        throw new Error(`Unsupported codec ${codeOrName}`)
    }

    return createRepo(path, loadCodec, {
        root: new ShardingDatastore(
            new S3Datastore(path, storeConfig),
            new NextToLast(2)
        ),
        blocks: new BlockstoreDatastoreAdapter(
            new ShardingDatastore(
                new S3Datastore(`${path}blocks`, storeConfig),
                new NextToLast(2)
            )
        ),
        datastore: new ShardingDatastore(
            new S3Datastore(`${path}datastore`, storeConfig),
            new NextToLast(2)
        ),
        keys: new ShardingDatastore(
            new S3Datastore(`${path}keys`, storeConfig),
            new NextToLast(2)
        ),
        pins: new ShardingDatastore(
            new S3Datastore(`${path}pins`, storeConfig),
            new NextToLast(2)
        )
    }, {
        repoLock
    })
}

module.exports = { createS3Repo }

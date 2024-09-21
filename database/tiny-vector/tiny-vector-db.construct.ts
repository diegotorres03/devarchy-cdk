import {
  CfnOutput,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { FunctionConstruct } from '../../compute'
import { Effect, IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { LayerVersion } from 'aws-cdk-lib/aws-lambda'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'

import { readFile, readdir, stat } from 'fs/promises'
// const fs = require("fs/promises"); 
// const { chunk } = require("llm-chunk");
import {
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
  TextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
} from "@langchain/textsplitters"

import {
  InvokeModelCommand,
  BedrockRuntimeClient,
} from "@aws-sdk/client-bedrock-runtime"

import { connect } from "@lancedb/lancedb"
// const { connect, LocalConnection, LocalTable } = require("vectordb");



let client = new BedrockRuntimeClient({
  region: "us-west-2",
});

const region = process.env.AWS_REGION || "us-east-2"

export class TinyVectorDBConstruct extends Construct {

  static deployCount = 0

  /**
   * This one runs the embeded lancedb
   *
   * @type {FunctionConstruct}
   * @memberof TinyVectorDBConstruct
   */
  db: FunctionConstruct

  searchFn: FunctionConstruct

  indexFolderFn: FunctionConstruct






  /**
   * Arn for lambda handler
   *
   * @type {string}
   * @memberof TinyVectorDBConstruct
   */
  invokeArn: string



  // [ ] create lambda functions for each action that will be exported in the layer
  // NOTE: the idea is that library consumers can either use the functions code imported from a layer, or the import a lambda function that does the same

  // [ ] search

  layer: LayerVersion
  layerName: string
  layerArn: string
  bucket: Bucket
  // searchHanler: FunctionConstruct



  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id)


    this.bucket = new Bucket(this, 'knowledgeBaseBucket')


    // [x] create function layer and handler
    this.db = new FunctionConstruct(this, `${id}_handler`)

    // HACK: this pats are assuming this is installed using NPM
    // [ ] find a way to use a relative path instead

    this.layerName = 'TinyVectorDB_lib'
    this.layer = this.db.createLayer(this.layerName, './node_modules/devarchy-cdk/database/tiny-vector/layers/tiny-vector-db-core')
    this.layerArn = this.layer.layerVersionArn

    this.db.code('./node_modules/devarchy-cdk/database/tiny-vector/functions/main')
    // this.db.code('./lib/tiny-vector-db/functions/main')

    // [x] add permision to Bedrock


    const titanPolicyStatement = new PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:${region}::foundation-model/amazon.titan-*`,
      ],
      effect: Effect.ALLOW,
    })

    this.db.handlerFn.addToRolePolicy(titanPolicyStatement)


    // SEARCH FN
    this.searchFn = new FunctionConstruct(this, 'searchVectorDB')
    this.searchFn.useLayer(this.layerName)
    this.searchFn.code(`async function handler(event) {
      const {search} = require('tinyVectorTools')

      console.log(search)
      console.log('event', JSON.stringify(event, null, 2))


      return { success: true }
    }`)
    this.searchFn.handlerFn.addToRolePolicy(titanPolicyStatement)

    // INDEX_FOLDER
    this.indexFolderFn = new FunctionConstruct(this, 'indexFolderFn')
    this.indexFolderFn.useLayer(this.layerName)
    this.indexFolderFn.code(`async function handler(event) {
      const {indexFolder} = require('tinyVectorTools')
      console.log('event', JSON.stringify(event, null, 2))

      console.log(indexFolder)


      return { success: true }  
    }`)

    this.indexFolderFn.handlerFn.addToRolePolicy(titanPolicyStatement)

    this.invokeArn = this.db.handlerFn.functionArn
    new CfnOutput(this, `${id}_Arn`, {
      value: this.db.handlerFn.functionArn,
      description: "Tiny Vector DB Arn",
      exportName: id,
    })

  }

  /**
   * Index a folder in place and create the database folder on that location
   *
   * @memberof TinyVectorDBConstruct
   */
  // async indexFolder(path: string, indexName: string) {

  //   const databaseName = 'tinyVector'

  //   const tableName = indexName

  //   const sampleVector = await getTitanEmbeddings(client, 'sampleText').catch(err => {
  //     console.log('ACA ES')
  //     console.warn(err)
  //   })

  //   const sampleFileIndexChunks = {
  //     ...sampleVector, path: './sample/path'
  //   }

  //   const { db, table } = await createDB(
  //     `data/${databaseName}`,
  //     tableName,
  //     sampleFileIndexChunks
  //   );

  //   const res = await indexFolder(client, table, path)

  //   console.log('\n\n\n\nRES====', res);


  // }

  /**
   * add a local folder to the knowledge base s3 (managed by TinyVector)
   *
   * @memberof TinyVectorDBConstruct
   */
  addDocs(sourcePath, destinationPath) {
    new BucketDeployment(this, 'deployStaticWebapp_' + TinyVectorDBConstruct.deployCount, {
      sources: [Source.asset(sourcePath)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: destinationPath ? destinationPath : undefined,
    });
    TinyVectorDBConstruct.deployCount += 1
    return this
  }

  grantRead(identity: IGrantable) {
    // [ ] Grand read access
    this.bucket.grantRead(identity)
  }


  grantWrite(identity: IGrantable) {
    // [ ] Grand write access
    this.bucket.grantWrite(identity)
  }

  grantReadWrite(identity: IGrantable) {
    // this.grantRead(identity)
    // this.grantReadWrite(identity)
    this.bucket.grantReadWrite(identity)
  }




}





// function changeCredentials(key, secret, token) {
//   client = new BedrockRuntimeClient({
//     region: 'us-west-2',
//     credentials: {
//       accessKeyId: key,
//       secretAccessKey: secret,
//       sessionToken: token,
//     },
//   })
// }

/**
 * Take simple text and translate it to a vector embeddings
 * using Amazon's titan-embed-text-v1 model
 *
 * @author Diego Torres
 * @version 1.0.0
 *
 * @param {BedrockRuntimeClient} client
 * @param {string} inputText
 * @return {Promise<{vector: Array<number>, item: string}>}
 */
async function getTitanEmbeddings(client, inputText) {
  const input = {
    body: JSON.stringify({ inputText }),
    contentType: "application/json",
    accept: "application/json",
    modelId: "amazon.titan-embed-text-v1",
  };

  const command = new InvokeModelCommand(input);
  const clientRes = await client.send(command);
  // console.log(clientRes)

  const response = JSON.parse(Buffer.from(clientRes.body).toString("utf8"));
  const vector = response.embedding;
  return {
    vector,
    item: inputText,
  };
}



async function indexFolder(client, table, path) {
  const dirRes = await readdir(path);
  console.log("dirRes", dirRes);

  const files = []
  for (let item of dirRes) {
    const filePath = `${path}/${item}`
    const stats = await stat(filePath)
    // if (stats.isFile()) files.push(item)
    if (stats.isFile()) {
      const indexRes = await indexFile(client, filePath)
      await table.add(indexRes)
    }
  }


  console.log('files', files)
  return files
}


async function indexFile(client, path) {
  const doc = (await readFile(path)).toString("utf-8");
  const chunks = await langChainTextSplit(doc);
  const vectors = await Promise.all(
    chunks.map((chunk) => getTitanEmbeddings(client, chunk))
  );

  return vectors.map((vector) => ({ ...vector, path }));
}


async function langChainTextSplit(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 128,
  });

  const chunks = await splitter.splitText(text);

  return chunks;
}


async function createDB(dbName, tableName, sampleItems) {
  const db = await connect(dbName);
  await db
    .dropTable(tableName)
    .catch((err) => console.warn("no table to delete", err));

  // console.log("sampleItems", sampleItems);
  const table = await db.createTable(tableName, sampleItems);
  return { db, table };
}

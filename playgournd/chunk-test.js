// const { chunk } = require("llm-chunk");
const {
  CharacterTextSplitter,
  RecursiveCharacterTextSplitter,
  TokenTextSplitter,
  TextSplitter,
  MarkdownTextSplitter,
  LatexTextSplitter,
} = require("@langchain/textsplitters");

const {
  InvokeModelCommand,
  BedrockRuntimeClient,
} = require("@aws-sdk/client-bedrock-runtime");

const { connect } = require("@lancedb/lancedb");
// const { connect, LocalConnection, LocalTable } = require("vectordb");

const fs = require("fs/promises");

async function createDB(dbName, tableName, sampleItems) {
  const db = await connect(dbName);
  await db
    .dropTable(tableName)
    .catch((err) => console.warn("no table to delete", err));

  console.log("sampleItems", sampleItems);
  const table = await db.createTable(tableName, sampleItems);
  return { db, table };
}

async function langChainTextSplit(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 128,
  });

  const chunks = await splitter.splitText(text);

  console.log("chunks", chunks.join("\n\n--\n\n"));

  return chunks;
}

let client = new BedrockRuntimeClient({
  region: "us-west-2",
});

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


indexFolder(client, './')

async function indexFile(client, path) {
  const doc = (await fs.readFile(path)).toString("utf-8");
  const chunks = await langChainTextSplit(doc);
  const vectors = await Promise.all(
    chunks.map((chunk) => getTitanEmbeddings(client, chunk))
  );

  return vectors.map((vector) => ({ ...vector, path }));
}

async function indexFolder(client, path) {
  const dirRes = await fs.readdir(path);
  console.log("dirRes", dirRes);


  const sampleFileIndexChunks = await indexFile(client, "./serial-port.md");

  const { db, table } = await createDB(
    "data/test-db",
    "samples",
    sampleFileIndexChunks
  );

  
  const files = []
  for( let item of dirRes) {
    const filePath = `${path}/${item}`
    const stats = await fs.stat(filePath)
    // if (stats.isFile()) files.push(item)
    if (stats.isFile()) {
      const indexRes = await indexFile(client, filePath)
      await table.add(indexRes)
    }  
  }


  console.log('files', files)
  return files
}

async function updateRemoteDB() {}



async function run() {
  // [ ] index sample file
  const sampleFileIndexChunks = await indexFile(client, "./serial-port.md");

  console.log("sampleFileIndexChunks", sampleFileIndexChunks);

  // [ ] create db
  const { db, table } = await createDB(
    "data/test-db",
    "samples",
    sampleFileIndexChunks
  );

  const res = await indexFolder("./");
  console.log("\n\n\nres\n\n", res);

  // const fileUrls = ['./webrtc.md', 'using-service-workers.md']

  // const files = await Promise.all(fileUrls.map(url => indexFile(client, url)))

  // const tableRes = await Promise.all(files.map(file => table.add(file)))

  // console.log('tableRes', tableRes)

  // const inputText = 'I want to know more about the serial interface'
  // const inputText = 'what are service workers?'

  // const question = await getTitanEmbeddings(client, inputText)

  // console.log('question', question)
  // const results = await table.vectorSearch(question.vector).limit(2).toArray()

  // results.forEach(result => {
  //   console.log('\n\nresult\n', result.item)
  // })

  // [ ] index rest of files and save on db
}

// run();

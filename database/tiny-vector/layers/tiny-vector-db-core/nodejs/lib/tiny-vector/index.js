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

const dbName = '/opt/cody-db'
const tableName = 'code'

// const dbName = "data/test-db";
// const tableName = "samples";

const { connect } = require("vectordb");
// const { connect } = require("@lancedb/lancedb");

const fs = require("fs/promises");

let client = new BedrockRuntimeClient({
  region: "us-east-1",
});

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

  const files = [];
  for (let item of dirRes) {
    const filePath = `${path}/${item}`;
    const stats = await fs.stat(filePath);
    // if (stats.isFile()) files.push(item)
    if (stats.isFile()) {
      const indexRes = await indexFile(client, filePath);
      await table.add(indexRes);
    }
  }

  console.log("files", files);
  return files;
}

/**
 * hace una busqueda en la base de datos local
 *
 */
async function search(query) {

  console.log('db', dbName)
  console.log('table', tableName)
  const queryEmbeddings = await getTitanEmbeddings(client, query);
  const db = await connect(dbName);

  console.log(await db.tableNames());
  const table = await db.openTable(tableName);
  const result = await table.search(queryEmbeddings.vector).limit(10).execute()

  console.log("query", query);
  return result;
}

// Q: que base de datos de vectores puedo usar para cargar archivos desde s3

// usar lambda para correr pedacitos peque~os de codigo

/**
 * se le pasa una ruta a un folder de s3 donde indexara todos los archivos,
 * la salida sera una carpeta de lancedb, que es nuestra base de datos de vectores local
 * esta si no se espesifica destino guardara el la misma carpeta de origen
 *
 * @example
 * indexFolder({ source: 's3://my.bucket/folder/to/index', destination: 's3:cede/layers/vectordb/layer1', embeddingsEngine: 'TitanTextEmbeddings'})
 *
 */
async function indexFolder({ source, destination, vectorEngine }) {
  console.log("params", { source, destination, vectorEngine });
  return {
    success: true,
    items: [],
  };
}

/**
 * Actualiza el contenido de lambda, usar cuando se hayan indexado docs nuevos
 *
 */
async function updateLayer() {
  console.log("updating layer");
  return {
    success: true,
    items: [],
  };
}

module.exports = {
  search,
  indexFolder,
  updateLayer,
};

// function run() {
//   const userPrompt = ''

//   const ragResut = search(userPrompt)

//   const prompt = `
//     basado en los siguientes docs

//     <DOCS>
//       ${ragResut}
//     </DOCS>

//     responder la siguiente pregunta del usuario

//     <PREGUNTA>
//       ${userPrompt}
//     </PREGUNTA>

//   `

//   const res = await askClaude(prompt)

// }

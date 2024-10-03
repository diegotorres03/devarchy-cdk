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

// const {
//   LambdaClient,
//   PublishLayerVersionCommand,
// } = require("@aws-sdk/client-lambda");

// const archiver = require("archiver");

// const dbName = "/opt/cody-db";
// const tableName = "code";

const dbName = "knowledge-base";
const tableName = "docs";

const { connect } = require("vectordb");
// const { connect } = require("@lancedb/lancedb");

const path = require("path");
const fs = require("fs/promises");

const { createWriteStream } = require("fs");

const {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

let bedrock = new BedrockRuntimeClient({
  region: "us-east-1",
});

const s3 = new S3Client();

async function createDB(dbName, tableName) {
  const sampleFileIndexChunks = await indexFile(
    bedrock,
    "./welcome.md",
    `# Welcome`
  );
  // const sampleData =
  const db = await connect(dbName);
  await db
    .dropTable(tableName)
    .catch((err) => console.warn("no table to delete", err));

  // console.log("sampleItems", sampleFileIndexChunks);
  if (!sampleFileIndexChunks)
    throw new Error("sample data was not generated correctly, sorry!");
  const table = await db.createTable(tableName, sampleFileIndexChunks);
  return { db, table };
}

async function langChainTextSplit(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 128,
  });

  if (!text) return console.warn("ACA ES CARAJO, NO HAY TEXTO");
  const chunks = await splitter.splitText(text);

  // console.log("chunks", chunks.join("\n\n--\n\n"));

  return chunks;
}

/**
 * Take simple text and translate it to a vector embeddings
 * using Amazon's titan-embed-text-v1 model
 *
 * @author Diego Torres
 * @version 1.0.0
 *
 * @param {BedrockRuntimeClient} bedrock
 * @param {string} inputText
 * @return {Promise<{vector: Array<number>, item: string}>}
 */
async function getTitanEmbeddings(bedrock, inputText) {
  const input = {
    body: JSON.stringify({ inputText }),
    contentType: "application/json",
    accept: "application/json",
    modelId: "amazon.titan-embed-text-v1",
  };

  const command = new InvokeModelCommand(input);
  const clientRes = await bedrock.send(command);
  // console.log(clientRes)

  const response = JSON.parse(Buffer.from(clientRes.body).toString("utf8"));
  const vector = response.embedding;
  return {
    vector,
    item: inputText,
  };
}

/**
 *
 *
 * @param {*} bedrock
 * @param {*} path
 * @param {string} doc
 * @return {Promise<{vector: number[], path: string, item: string}[] | void>}
 */
async function indexFile(bedrock, path, doc) {
  if (!doc) return console.warn("NO DOC");
  console.log("splitting", path, Object.keys(doc));
  if (!path || !doc) return console.warn("no doc or path", path);
  const chunks = (await langChainTextSplit(doc)) || [];
  const vectors = await Promise.all(
    chunks.map((chunk) => getTitanEmbeddings(bedrock, chunk))
  );

  return vectors.map((vector) => ({ ...vector, path }));
}

/**
 * se le pasa una ruta a un folder de s3 donde indexara todos los archivos,
 * la salida sera una carpeta de lancedb, que es nuestra base de datos de vectores local
 * esta si no se espesifica destino guardara el la misma carpeta de origen
 *
 * @example
 * indexFolder({ source: 's3://my.bucket/folder/to/index', destination: 's3:cede/layers/vectordb/layer1', embeddingsEngine: 'TitanTextEmbeddings'})
 *
 */

// async function indexFolder(path) {

// }

async function indexLocalFolder(client, path) {
  const dirRes = await fs.readdir(path);
  // console.log("dirRes", dirRes);

  const { db, table } = await createDB(`data/${dbName}`, "samples");

  const files = [];
  for (let item of dirRes) {
    const filePath = `${path}/${item}`;
    const stats = await fs.stat(filePath);
    // if (stats.isFile()) files.push(item)
    if (stats.isFile()) {
      const doc = (await fs.readFile(path)).toString("utf-8");
      const indexRes = await indexFile(client, filePath, doc);
      if (indexRes) await table.add(indexRes);
    }
  }

  // console.log("files", files);
  return files;
}

/**
 *
 * @param {string} path
 */
async function indexS3Folder(path, dbName) {
  let totalTime = Date.now();
  const { bucket, prefix } = parseS3Url(path);

  const command = new ListObjectsCommand({
    Bucket: bucket,
    Prefix: prefix,
  });

  const res = await s3.send(command);

  // console.log("res", res);

  // [ ] get individual files
  const filePromises = res.Contents?.map((item) => {
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: item.Key,
    });
    return s3.send(getObjectCommand).then(async (res) => ({
      path: `s3://${bucket}/${item.Key}`,
      doc: await res.Body?.transformToString("utf8"),
    }));
  });

  const files = await Promise.all(filePromises ?? []);

  const { db, table } = await createDB(`/tmp/${dbName}`, "samples");

  for (let file of files) {
    if (file.doc && file.path) {
      const indexRes = await indexFile(bedrock, file.path, file.doc);
      if (indexRes) await table.add(indexRes);
    }
  }

  console.log(await fs.readdir(`/tmp/${dbName}`));
  console.log(await fs.readdir(`/tmp`));

  const tinyBucket = process.env.TINY_DB_BUCKET;
  await uploadFolderToS3(dbName, tinyBucket, `db/${dbName}`);

  // console.log("files", files);

  // [ ] chunk then

  totalTime = Date.now() - totalTime;
  return { success: true, time: totalTime };
}

async function uploadFolderToS3(dbName, bucket, prefix) {
  // running code
  try {
    await uploadFolder(bucket, `/tmp/${dbName}`, prefix);
    console.log("Folder upload completed successfully");
  } catch (err) {
    console.error("Error uploading folder:", err);
  }

  // Function to upload a single file to S3
  async function uploadFile(bucket, filePath, s3Key) {
    // if(filePath)

    const fileContent = await fs.readFile(filePath);

    const params = {
      Bucket: bucket,
      Key: s3Key,
      Body: fileContent,
    };

    try {
      await s3.send(new PutObjectCommand(params));
      console.log(`Successfully uploaded ${filePath} to ${bucket}/${s3Key}`);
    } catch (err) {
      console.error(`Error uploading ${filePath}:`, err);
    }
  }

  // Function to recursively upload a folder and its contents
  async function uploadFolder(bucket, dbName, s3Prefix = "") {
    // const folderPath = dbName
    const folderPath = dbName;
    const files = await fs.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        // Recursively upload subdirectories
        await uploadFolder(bucket, filePath, path.join(s3Prefix, file));
      } else {
        // Upload file
        const s3Key = path.join(s3Prefix, file);
        await uploadFile(bucket, filePath, s3Key);
      }
    }
  }
}

// // Usage
// const localFolderPath = "./local";
// const s3BucketPath = "s3://your-bucket-name/remote";

// uploadFolderToS3(localFolderPath, s3BucketPath)
//   .then(() => console.log("Upload completed successfully"))
//   .catch((error) => console.error("Upload failed:", error));

function parseS3Url(url) {
  const pattern = /^s3:\/\/([^/]+)(?:\/(.*))?$/;
  const match = url.match(pattern);

  if (match) {
    const bucket = match[1];
    const prefix = match[2] || ""; // Use empty string if prefix is undefined
    return { bucket, prefix };
  } else {
    return { bucket: null, prefix: null };
  }
}

/**
 * hace una busqueda en la base de datos local
 *
 */
async function search(dbName, tableName, query) {
  console.log("db", dbName);
  console.log("table", tableName);
  const queryEmbeddings = await getTitanEmbeddings(bedrock, query);
  const db = await connect(dbName);

  console.log(await db.tableNames());
  const table = await db.openTable(tableName);
  const result = await table.search(queryEmbeddings.vector).limit(10).execute();

  // console.log("query", query);
  return result;
}

// Q: que base de datos de vectores puedo usar para cargar archivos desde s3

// usar lambda para correr pedacitos peque~os de codigo

/**
 * Actualiza el contenido de lambda, usar cuando se hayan indexado docs nuevos
 *
 */

const s3Client = new S3Client();
// const lambdaClient = new LambdaClient();

async function updateLayer(s3Source, layerName) {
  console.log("Updating layer...");

  const { bucket, prefix } = parseS3Url(s3Source);

  if (!bucket || !prefix) {
    throw new Error("Invalid S3 URL");
  }

  // Create a temporary directory to store the files
  const tempDir = `/tmp/${layerName}`;
  await fs.mkdir(tempDir, { recursive: true });

  // Download all files from S3
  await downloadS3Folder(bucket, prefix, tempDir);

  // Create a zip file
  const zipPath = `/tmp/${layerName}.zip`;
  // await createZipFile(tempDir, zipPath);

  // Read the zip file
  const zipContent = await fs.readFile(zipPath);

  // Publish the layer
  // const layerVersion = await publishLayer(layerName, zipContent);

  // Clean up
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.unlink(zipPath);

  // console.log(`Layer updated successfully. Version: ${layerVersion}`);
  // return { success: true, layerVersion };
}

async function downloadS3Folder(bucket, prefix, localDir) {
  const listParams = { Bucket: bucket, Prefix: prefix };
  let isTruncated = true;

  while (isTruncated) {
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await s3Client.send(listCommand);

    for (const file of listResponse.Contents || []) {
      if (!file?.Key?.endsWith("/")) {
        // Skip folders
        const getParams = { Bucket: bucket, Key: file.Key };
        const getCommand = new GetObjectCommand(getParams);
        const response = await s3Client.send(getCommand);

        const fileContent = await response?.Body?.transformToByteArray();
        if (file.Key) {
          const filePath = path.join(localDir, file.Key.slice(prefix.length));
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, fileContent || "no content");
        }
      }
    }

    isTruncated = !!listResponse.IsTruncated;
    if (isTruncated) {
      listParams.ContinuationToken = listResponse.NextContinuationToken;
    }
  }
}

// [ ] zip layer content
// function createZipFile(sourceDir, outputPath) {
//   return new Promise((resolve, reject) => {
//     const output = createWriteStream(outputPath);
//     const archive = archiver("zip", { zlib: { level: 9 } });

//     output.on("close", resolve);
//     archive.on("error", reject);

//     archive.pipe(output);
//     archive.directory(sourceDir, false);
//     archive.finalize();
//   });
// }

// async function publishLayer(layerName, zipContent) {
//   const params = {
//     LayerName: layerName,
//     Description: `Layer created from S3 folder`,
//     Content: {
//       ZipFile: zipContent,
//     },
//     CompatibleRuntimes: ["nodejs20.x", "nodejs16.x", "nodejs18.x"], // adjust as needed
//   };

//   const command = new PublishLayerVersionCommand(params);
//   const response = await lambdaClient.send(command);
//   return response.Version;
// }

function parseS3Url(url) {
  const pattern = /^s3:\/\/([^/]+)\/(.*)$/;
  const match = url.match(pattern);

  if (match) {
    return { bucket: match[1], prefix: match[2] };
  } else {
    return { bucket: null, prefix: null };
  }
}

async function askClaude(message, options = { version: "v1", messages: [] }) {
  console.log("ASKING CLAUDE TEXT");
  const versionMap = {
    v1: "anthropic.claude-instant-v1",
    v2: "anthropic.claude-v2",
  };

  const prompt = `${options?.messages || ""}\n\nHuman: ${message}\nAssistant:`;
  console.log("PROMPT:", prompt);

  const command = new InvokeModelCommand({
    modelId: versionMap[options.version] || "anthropic.claude-instant-v1",
    accept: "*/*",
    contentType: "application/json",
    body: JSON.stringify({
      prompt,
      max_tokens_to_sample: 3000,
      temperature: 0.5,
      top_k: 250,
      top_p: 1,
    }),
  });

  const response = await bedrock.send(command).catch((err) => {
    console.log("bedrock error");
    console.error(err);
    throw err;
  });

  const textResponse = JSON.parse(
    // @ts-ignore
    Buffer.from(response.body, "base64").toString("utf8")
  ).completion;
  // console.log('RESPONSE:', textResponse)
  return textResponse.trim();
}

module.exports = {
  search,
  indexLocalFolder,
  indexS3Folder,
  updateLayer,
  askClaude,
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

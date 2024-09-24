const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require('@aws-sdk/client-bedrock-runtime')

// project name is LanceDB https://lancedb.com/
const { connect, LocalConnection, LocalTable } = require('vectordb')

/** @type {BedrockRuntimeClient} */
const client = new BedrockRuntimeClient({ region: 'us-west-2' })


/** @type {LocalConnection} */
let db

/** @type {LocalTable} */
let table


const dbName = process.env.DB_NAME || 'cody-db'

/**
 * Handler function for TinyVectorDB
 *
 * @param {Object} event
 */
exports.handler = async (event) => {

  console.log(JSON.stringify(event, undefined, 2))
  // @ts-ignore
  if (!db) db = await connect(`/opt/${dbName}`)
    // @ts-ignore
  if (!table) table = await db.openTable('code')

  const searchText = getTextFromEvent(event)
  const result = await search(client, table, searchText)
  console.log(result)

  return result.map(item => {
    const newItem = {...item}
    delete newItem.vector
    return newItem
  })
}

/**
 * Get the search text from the event
 * Ideally I will use this to get text even if the source
 * is ApiGateway, GQL, SNS, SQS, and so on.
 * @author Diego Torres 
 * @version 0.0.1
 * @since 2023-11-15
 * @param {*} event
 * @return {*} 
 */
function getTextFromEvent(event) {
  return event.detail || event.body || event.searchText || event.queryStringParameters.searchText
}


/**
 * Take simple text and translate it to a vector embeddings
 * using Amazon's titan-embed-text-v1 model
 * 
 * @author Diego Torres
 * @version 1.0.0
 * @since 2023-11-15
 *
 * @param {BedrockRuntimeClient} client
 * @param {string} inputText
 * @return {Promise<{vector: Array<number>, item: string}>} 
 */
async function translateEmbeddings(client, inputText) {
  console.log('inputText', inputText)

  const input = {
    modelId: 'amazon.titan-embed-text-v1',
    contentType: 'application/json',
    accept: '*/*',
    body: JSON.stringify({ inputText })
  }

  const command = new InvokeModelCommand(input)
  const response = await client.send(command)
    .catch(err => console.log(err))

     
  const completion = JSON.parse(Buffer.from(response.body, 'base64').toString())
  const vector = completion.embedding

  return {
    vector,
    item: inputText
  }
}

/**
 * Look for similar text in a local table (using LanceDB)
 *  
 * @author Diego Torres
 * @version 1.0.0
 * @since 2023-11-15
 * 
 * @param {BedrockRuntimeClient} client
 * @param {LocalTable} table
 * @param {Array<number>} userInput
 * @return {Promise<Object>} 
 */
async function search(client, table, userInput) {
  console.log('userInput', userInput)
  const userImputEmbedding = await translateEmbeddings(client, userInput)
  console.log('userImputEmbedding', userImputEmbedding)

  const query = await table.search(userImputEmbedding.vector)
    .limit(2).execute()

  return query
}
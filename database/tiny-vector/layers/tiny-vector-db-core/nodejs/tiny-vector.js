/**
 * hace una busqueda en la base de datos local
 *
 */
async function search(query) {
  console.log("query", query);
  return {
    success: true,
    items: [],
  };
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

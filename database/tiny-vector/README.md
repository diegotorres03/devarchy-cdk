# TinyVectorDB

This is a light weight vector database that will run in a lambda function, using layers as a vector store.

Ideally, it should start as a lambda but scale as containers or event ec2 instances later on.


## Vision
```typescript

const tinyVector = new TiniVectorDBConstuct(this, 'vectorDB')

const endpointHandler = new FunctionConstruct(this, 'endpointhandler')
endpointHandler.code('./path/to/code')

tinyVector.grandReadWrite(endpointHandler.handlerFn)


```


createDWCK() {

  const bedrockPolicyStatement = new IAM.PolicyStatement({
    actions: [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    resources: ['*'],
    effect: IAM.Effect.ALLOW,
  })

  const pipeline = new PipeConstruct(this, 'DWCKPipeline')
  const codeRepo = pipeline
    .createCodeRepository('dwck-lib', 'reusable web components repository')

  this.ide.addRepository(codeRepo) // so the ide has the repo pre-cloned


  const buildSpec = { ...PipeConstruct.DEPLOY_NPM }

  buildSpec.phases.install.commands.push('git submodule init')
  buildSpec.phases.install.commands.push('git submodule update')
  buildSpec.phases.pre_build.commands.push('npm i -g webpack-cli')
  // buildSpec.phases.build.commands.push('npm run build')

  pipeline
    .source(codeRepo)
    .build(buildSpec, {
      s3Bucket: this.artifactBucket,
    })


  const table = new DynamoCostruct(this, 'DevarchyDemoTable')
  table.addKeys('userId', 'id')

  const functionOptions = {
    env: {
      TABLE_NAME: table.table?.tableName || ''
    },
  }

  const wsApi = new WebSocketApiConstruct(this, 'DemoWSApi')


  const onConnect = new FunctionConstruct(this, 'onConnect')
  const wsDemoLayer = onConnect.createLayer('wsDemoTools', './layers/ws-demo-tools')

  // @ts-ignore
  onConnect.code((async (event, context) => {
    // console.log(event)
    const { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb')
    const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')

    const client = new DynamoDBClient()

    const connectionId = event.requestContext?.connectionId || 'no connection id';
    const Item = marshall({
      userId: 'tbd',
      id: 'connectionId',
      connectionId,
      // detail: body
    })
    console.log('Item')
    console.log(Item)

    const TableName = process.env.TABLE_NAME;

    const putComand = new PutItemCommand({
      TableName,
      Item,
    });

    // await client.send(putComand).catch(err => {
    //   console.log('aca esta el error')
    //   console.error(err)
    // })

    return {
      statusCode: 200,
      // body: JSON.stringify(Item),
    }

  }).toString(), functionOptions)



  table.table?.grantWriteData(onConnect.handlerFn)

  // @ts-ignore
  wsApi.addRoute('$connect', onConnect.handlerFn)


  /// OnLogin
  const onLogin = new FunctionConstruct(this, 'onLogin')
  onLogin.useLayer('wsDemoTools')
  onLogin.code((async event => {
    const { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb')
    const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')


    const client = new DynamoDBClient()

    const connectionId = event.requestContext?.connectionId || 'no connection id';

    console.log(event)
    const data = JSON.parse(event.body)
    console.log(data)

    const Item = marshall({
      userId: data.userId,
      id: data.id,
      connectionId,
      // detail: body
    })

    console.log('Item')
    console.log(Item)

    const TableName = process.env.TABLE_NAME;

    const putComand = new PutItemCommand({
      TableName,
      Item,
    });



    await client.send(putComand).catch(err => {
      console.log('aca esta el error')
      console.error(err)
    })
    return {
      statusCode: 200,
      // body: JSON.stringify(unmarshall(Item))
    }

  }).toString(), functionOptions)

  table.table?.grantWriteData(onLogin.handlerFn)

  wsApi.addRoute('login', onLogin.handlerFn)


  /// OnEvent
  const onEvent = new FunctionConstruct(this, 'onEvent')

  onEvent.useLayer('wsDemoTools')

  // @ts-ignore
  onEvent.code((async (event, context) => {

    const { DynamoDBClient, PutItemCommand, ScanCommand, QueryCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb')
    const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')

    const { ApiGatewayManagementApiClient, PostToConnectionCommand, } = require('@aws-sdk/client-apigatewaymanagementapi')

    const TableName = process.env.TABLE_NAME;
    const client = new DynamoDBClient()

    const connectionId = event.requestContext?.connectionId || 'no connection id';

    console.log(event)
    const { data } = JSON.parse(event.body)

    // const Item = marshall({
    //   userId: data.userId,
    //   id: 'connectionId',
    //   connectionId,
    //   // detail: body
    // })

    // console.log('Item')
    // console.log(Item)


    // const putComand = new PutItemCommand({
    //   TableName,
    //   Item,
    // });


    // await client.send(putComand).catch(err => {
    //   console.log('aca esta el error')
    //   console.error(err)
    // })
    console.log(data.recipientId)
    if (!data.recipientId) {
      data.recipientId = data.userId
    }

    const recipientId = data.recipientId || data.userId
    try {

      console.log('beffore marshall')

      const props = {
        TableName,
        // ExpressionAttributeNames: {
        //   '#userId': 'userId'
        // },
        ExpressionAttributeValues: {
          ':userId': { S: recipientId },
        },
        KeyConditionExpression: 'userId = :userId',
      }
      console.log('props', props)
      const peerRes = await client.send(new QueryCommand(props))

      console.log('res', peerRes.Items)

      const peers = peerRes.Items.map(item => unmarshall(item))
      console.log(peers)

      delete data.__eventSource
      console.log('data', JSON.stringify(data, null, 2))
      
      const apiClient = new ApiGatewayManagementApiClient({
        region: 'us-east-2',
        // endpoint: 'wss://mh8nrjiabg.execute-api.us-east-2.amazonaws.com/DemoWSApi_dev_stage/',
        endpoint: 'https://mh8nrjiabg.execute-api.us-east-2.amazonaws.com/DemoWSApi_dev_stage/'
      })




      const promises = peers
        .filter(peer => peer.connectionId !== connectionId)
        .map(peer => {
          console.log('sending message to', connectionId)
          return new PostToConnectionCommand({
            ConnectionId: peer.connectionId,
            // Data: 'Hello World',
            Data: Buffer.from(JSON.stringify({
              event: 'navigate',
              data: { hash: data.hash }, // data.data D= really?? TODO: rename
            })) //or new TextEncoder().encode("")
          })
        })
        .map(command => apiClient.send(command).catch(err => {
          console.log(err.message)
        }))
      // const response = await apiClient.send(command)

      await Promise.all(promises)
    } catch (err) {
      console.error(err)
    }


    // const { askClaude } = require('bedrock-tools')
    // console.log(JSON.stringify(event, null, 2))
    // console.log('askClaude', askClaude)
    // const body = JSON.parse(event.body)
    // const response = await askClaude(body.prompt)
    // console.log('Response', response)

    return {
      statusCode: 200,
      // detail: JSON.stringify(unmarshall(Item))
    }
  }).toString(), functionOptions)

  // @ts-ignore
  onEvent.handlerFn.role?.addToPrincipalPolicy(bedrockPolicyStatement)

  // @ts-ignore
  onEvent.handlerFn.addToRolePolicy(new IAM.PolicyStatement({
    effect: IAM.Effect.ALLOW,
    actions: ['execute-api:ManageConnections'],
    resources: ['arn:aws:execute-api:us-east-2:177624785149:mh8nrjiabg/DemoWSApi_dev_stage/POST/@connections/*'], // TODO: scope down
  }))

  table.table?.grantReadWriteData(onEvent.handlerFn)

  wsApi.addRoute('event', onEvent.handlerFn)





  const demoApi = new RestApiConstruct(this, 'DemoApi')
  demoApi.cors()



  if (!table || !table.table) return
  demoApi.get('/users')?.dynamodb(table.table, {
    integrationResponses: [{
      statusCode: '200',

      // @ts-ignore
      responseParameters: {
        'method.response.header.Access-Control-Allow-Origin': "'*'",
      },
      responseTemplates: {
        // 'application/json':`$input.body`,
        // 'application/json':`
        // #set($items = $input.path('$.Items'))
        // [
        // #foreach($elem in $items)
        //  {
        //    "userId" : "$elem.userId.S",
        //    "id" : "$elem.id.S"
        //  }#if($foreach.hasNext),#end
        // #end
        // ]
        // `,
        'text/html': `
          #set($items = $input.path('$.Items'))
          
          #foreach($item in $items)
            <note-card id="$item.id.S" data-user-id="$item.userId.S">"$item.userId.S"</note-card>
          #end
        `,
      },
    }],
    access: [(methodRole: IAM.Role) => methodRole.addToPolicy(new IAM.PolicyStatement({
      actions: ['dynamodb:BatchGetItem', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:Scan', 'dynamodb:DescribeTable'],
      effect: IAM.Effect.ALLOW,
      resources: [table.table?.tableArn || '']
    })),
      // @ts-ignore
      // (methodRole: IAM.Role) => table.table?.grantReadData(methodRole),
    ]
  })

  // @ts-ignore
  demoApi.get('/items', (async function (event, context) {
    console.log(JSON.stringify(event, null, 2))
    return {
      statusCode: 200,
      body: `
        <simple-card>hi</simple-card>
        <simple-card>hi</simple-card>
        <simple-card>hello</simple-card>
      `,
      // body: JSON.stringify({
      //   message: 'hello world',
      // }),
      headers: {
        'Content-type': 'text/html',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'
      }
    }
  }).toString())


  const askLlm = new FunctionConstruct(this, 'AskLlm')
  askLlm.useLayer('wsDemoTools')
  askLlm.code((async (event) => {
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi')
    const { askClaude } = require('bedrock-tools')
    console.log(JSON.stringify(event, null, 2))
    console.log('askClaude', askClaude)
    const body = JSON.parse(event.body)
    const response = await askClaude(body.prompt)
    console.log('Response', response)

    const apiClient = new ApiGatewayManagementApiClient({
      region: 'us-east-2',
      endpoint: 'wss://mh8nrjiabg.execute-api.us-east-2.amazonaws.com/DemoWSApi_dev_stage/',
      // endpoint: 'https://mh8nrjiabg.execute-api.us-east-2.amazonaws.com/DemoWSApi_dev_stage/@connections'
    })

    const command = new PostToConnectionCommand({
      ConnectionId: 'YPZzGdiiiYcCFSw=',
      Data: 'Hello World',
    })

    const asd = await apiClient.send(command)

    console.log(response)


    return {
      statusCode: 200,
      body: JSON.stringify({ response }),
      headers: {
        'Content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'
      }
    }
  }).toString())


  // @ts-ignore
  askLlm.handlerFn.role?.addToPrincipalPolicy(bedrockPolicyStatement)

  demoApi.post('/ask-llm')?.fn(askLlm.handlerFn)

}

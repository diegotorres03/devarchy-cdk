
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import * as Dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as SQS from 'aws-cdk-lib/aws-sqs';

import * as IAM from 'aws-cdk-lib/aws-iam';

import { Stack } from 'aws-cdk-lib'

import { Construct } from 'constructs';
import { FunctionConstruct, FunctionOptions } from '../../compute';
// import { WebAppConstruct } from '../../webapp/webapp-construct'


// const unimplementedError = new Error('this method has not been implemented, feel free to contribute =)')


/**
 *
 * @author Diego Tores <diegotorres0303@gmail.com>
 *
 * @export
 * @class RestApiConstruct
 * @extends {Construct}
 */
export class RestApiConstruct extends Construct {

  private currentAuthorizer?: ApiGateway.RequestAuthorizer; // Lambda.Function
  private currentHandler?: Lambda.Function;
  api: ApiGateway.RestApi;
  private corsOptions: any
  private corsEnabledPaths: Set<string> = new Set();



  constructor(scope: Construct, id: string) {
    super(scope, id)


    this.api = new ApiGateway.RestApi(this, id + '_api', {
      deployOptions: { stageName: process.env.STAGE || 'dev' },

    });


    // const exampleAuthorizer = './path/to/auth'
    // const exampleHandler = (ev => ({ statusCode: 204 })).toString()

    // const dynamo = {} as Construct
    // const api = this
    // api
    //     .cors() // this add default cors
    //     .authorizer(exampleAuthorizer)
    //     .get('/users', exampleHandler).readFrom(dynamo)
    //     .post('/users/{userId}', exampleHandler).writeTo(dynamo)


  }

  private addCorsPreflight(resource: ApiGateway.IResource) {
    const path = resource.path;
    if (!this.corsEnabledPaths.has(path) && this.corsOptions) {
      resource.addCorsPreflight(this.corsOptions);
      this.corsEnabledPaths.add(path);
    }
  }
  

  /**
   * enable cors for this API
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {ApiGateway.CorsOptions} [options]
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  cors(options?: ApiGateway.CorsOptions): RestApiConstruct {
    const defaultOptions = {
      allowOrigins: ApiGateway.Cors.ALL_ORIGINS,
      allowMethods: ApiGateway.Cors.ALL_METHODS,
      allowHeaders: [
        'Content-type', 'X-Amz-Date', 'X-Api-Key', 'Authorization',
        'Access-Controll-Allow-Headers', 'Access-Controll-Allow-Origins', 'Access-Controll-Allow-Methods',
      ],
      allowCredentials: true,
    };
    this.corsOptions = options || defaultOptions;

    // this.api.root.addCorsPreflight(this.corsOptions);
    this.addCorsPreflight(this.api.root)
    return this;
  }



  /**
   * add a webapp construct on cors
   *
   * @param {WebAppConstruct} webapp
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  // addToCors(webapp: WebAppConstruct): RestApiConstruct {
  //     // const origin = webapp.
  //     throw unimplementedError
  //     return this
  // }

  /**
   * create an authorizer and use it in the followin lambdas until a new authorizer is created
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {string} handlerCode
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  authorizer(name: string, handlerCode: string): RestApiConstruct {
    const authFn = new FunctionConstruct(this, `${name}_authorizer`);
    authFn.code(handlerCode);

    const authorizer = new ApiGateway.RequestAuthorizer(this, 'MyAuthorizer', {
      handler: authFn.handlerFn,
      identitySources: [
        ApiGateway.IdentitySource.header('Authorization'),
        ApiGateway.IdentitySource.queryString('allow'),
      ],
    });

    this.currentAuthorizer = authorizer;

    return this;
  }


  /**
   * let the last created lambda hace read access to a given construct
   *
   * Supported targets:
   * - DynamoDB
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {Construct} construct
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  readFrom(construct: Construct): RestApiConstruct {
    if (!this.currentHandler) throw new Error('you need to create a handler function first');

    // if Dynamo
    const table = construct as Dynamo.Table;
    table.grantReadData(this.currentHandler);


    return this;
  }

  /**
   * let the last created lambda hace write access to a given construct
   *
   * Supported targets:
   * - DynamoDB
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {Construct} construct
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  writeTo(construct: Construct): RestApiConstruct {
    if (!this.currentHandler) throw new Error('you need to create a handler function first');


    // if Dynamo
    const table = construct as Dynamo.Table;
    table.grantWriteData(this.currentHandler);


    return this;
  }

  /**
   * create a lambda integration
   * the code variable can be js code as a string, 'async (event) => {}'
   * the path to a local folder './path/to/code/folder'
   * or the path to an s3 bucket  's3://bucket/path/to/code'
   *
   * @private
   * @param {string} method
   * @param {string} path
   * @param {string} handlerCode
   * @param {FunctionOptions} [options]
   * @memberof RestApiConstruct
   */
  private createLambdaIntegration(method: string, path: string, handlerCode: string, options?: FunctionOptions) {

    console.log('use authorizer here', this.currentAuthorizer);
    const fn = new FunctionConstruct(this, `${method}_${path}_handler`);
    fn.code(handlerCode, options);
    // [ ] deals with options

    // [ ] deal with layers
    const integrationOptions = this.currentAuthorizer ? { authorizer: this.currentAuthorizer } : undefined;
    const integration = new ApiGateway.LambdaIntegration(fn.handlerFn); // {proxy: true}
    const resource = this.api.root.resourceForPath(path)
    resource.addMethod(method, integration, integrationOptions);

    // resource.defaultCorsPreflightOptions
    // resource.addCorsPreflight(this.corsOptions)
    this.addCorsPreflight(resource)


    this.currentHandler = fn.handlerFn;
  }

  /**
   * Create an ApiGateway Mock integration,
   * just pass the json object you want as response
   * as the mockResponse object
   * and enjoy
   *
   * @private
   * @param {string} method
   * @param {string} path
   * @param {Object} mockResponse - desired endpoint response
   * @memberof RestApiConstruct
   */
  private createMockIntegration(method: string, path: string, mockResponse: any) {

    const integration = new ApiGateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: { 
            // NOTE: Mock integration support for json, xml and html
            'application/json': JSON.stringify(mockResponse),
            'application/xml': mockResponse,
            'text/html': mockResponse,
          }
        },
      ],
      passthroughBehavior: ApiGateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{ "statusCode": 200 }' },
    })

    // const integrationOptions: ApiGateway.MethodOptions = this.currentAuthorizer ?
    //   { authorizer: this.currentAuthorizer } :
    //   undefined

    const integrationOptions: ApiGateway.MethodOptions = {
      authorizer: this.currentAuthorizer || undefined,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        }
      }]
    }

    const resource = this.api.root.resourceForPath(path)
    resource.addMethod(method, integration, integrationOptions);
    // resource.addCorsPreflight(this.corsOptions)
    this.addCorsPreflight(resource)


  }

  private createHTTPIntegration(method: string, path: string, url: string) {
    const integration = new ApiGateway.HttpIntegration(url)

    const resource = this.api.root.resourceForPath(path)
    resource.addMethod(method, integration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
        }
      }],
      authorizer: this.currentAuthorizer || undefined,
    });
    // resource.addCorsPreflight(this.corsOptions)
    this.addCorsPreflight(resource)
  
  
  }

  private handleIntegration(
    method: string,
    path: string,
    handlerCode?: string | Function | Object,
    options?: FunctionOptions) {
    if (!handlerCode) {

      const addMethod = (integration: ApiGateway.Integration) => {
        const resource = this.api.root.resourceForPath(path)
        resource.addMethod(method, integration, {
          methodResponses: [{
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            }
          }],
          authorizer: this.currentAuthorizer || undefined,
        })
        // resource.addCorsPreflight(this.corsOptions)
        this.addCorsPreflight(resource)


      }

      return {
        // [ ] how can I give access???
        dynamodb: (table: Dynamo.Table, options?: {
          access?: Function[],
          requestTemplates?: { [contentType: string]: string },
          integrationResponses?: {
            statusCode: string,
            responseTemplates: { [contentType: string]: string }
          }[]
        }) => {

          const partitionKeyName = table.schema().partitionKey.name
          const sortKeyName = table.schema().sortKey?.name


          const methodMap = {
            GetItem: {
              requestTemplates: {
                'application/json': `
                #set($partitionKey = $input.params('${partitionKeyName}'))
                #set($sortKey = $input.params('${sortKeyName}'))
                {
                  "TableName": "${table.tableName}",
                  "Key": {
                    "${partitionKeyName}": { 
                      "S": "$partitionKey"
                    }
                    ${sortKeyName ? `,
                    "${sortKeyName}": {
                      "S": "$sortKey"
                    }`: ''}
                    
                  }
                }
                `
              },
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  // #set($inputRoot = $input.path('$'))
                  // #set($response = $util.toJson($inputRoot))
                  'application/json': `$input.body`
                }
              }],
            },
            Query: {
              requestTemplates: {
                'application/json': `
                  #set($partitionKey = $input.params('${partitionKeyName}'))
                  {
                    "TableName": "${table.tableName}",
                    "KeyConditionExpression": "#partitionKey = :partitionKey",
                    "ExpressionAttributeNames": {
                      "#partitionKey":  "${partitionKeyName}" 
                    },
                    "ExpressionAttributeValues": {
                      ":partitionKey": { "S": "$input.params('${partitionKeyName}')" }
                    }
                  }
                  `
              },
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  // #set($inputRoot = $input.path('$'))
                  // #set($response = $util.toJson($inputRoot))
                  'application/json': `$input.body`
                }
              }],
            },
            Scan: {
              requestTemplates: {
                'application/json': `
                  #set($partitionKey = $input.params('${partitionKeyName}'))
                  #set($sortKey = $input.params('${sortKeyName}'))
                  {
                    "TableName": "${table.tableName}"
                  }
                  `
              },
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  // #set($inputRoot = $input.path('$'))
                  // #set($response = $util.toJson($inputRoot))
                  'application/json': `$input.body`
                }
              }],
            },

            PutItem: {
              requestTemplates: {
                'application/json': `
                #set($inputRoot = $input.path('$') )
                {
                  "TableName": "${table.tableName}",
                  "Item": $input.body
                }
              `},
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  'application/json': `
                    #set($inputRoot = $input.path('$'))
                    $inputRoot`
                }
              }]

            },
            DeleteItem: {
              requestTemplates: {
                'application/json': `
                #set($partitionKey = $input.params('${partitionKeyName}'))
                #set($sortKey = $input.params('${sortKeyName}'))

                {
                  "TableName": "${table.tableName}",
                  "Key": {
                    "${partitionKeyName}": { 
                      "S": "$partitionKey"
                    }
                    ${sortKeyName ? `,
                    "${sortKeyName}": {
                      "S": "$sortKey"
                    }`: ''}
                    
                  }
                }
                `

              },
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  'application/json': `
                    #set($inputRoot = $input.path('$'))
                    $inputRoot`
                }
              }]
            },
            UpdateItem: {
              requestTemplates: ``,
              integrationResponses: [
                {}
              ]

            },
          }


          const methodRole = new IAM.Role(this, `${method}-${path}-integration-role`, {
            assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
          })

          // docs on velocity utils and stuff https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#context-variable-reference

          let action = ''
          if (method === 'GET') {
            if (!path.includes(`{${partitionKeyName}}`) && !path.includes(`{${sortKeyName}}`)) {
              action = 'Scan'
            } else if (path.includes(`{${partitionKeyName}}`) && !path.includes(`{${sortKeyName}}`)) {
              action = 'Query'
            } else if (path.includes(`{${partitionKeyName}}`) && path.includes(`{${sortKeyName}}`)) {
              action = 'GetItem'
            }
          } else if (method === 'POST') {
            action = 'PutItem'
          } else if (method === 'PUT') {
            action = 'PutItem'
          }
          else if (method === 'DELETE') {
            action = 'DeleteItem'
          }
          else if (method === 'PATCH') {
            action = 'UpdateItem'
          }
          else {
            throw new Error(`I don't know how to handle ${method}`)
          }

          const requestParameters = {}
          if (path.includes(`{${partitionKeyName}}`)) {
            // @ts-ignore
            requestParameters[`integration.request.path.${partitionKeyName}`] = `'method.request.path.${partitionKeyName}'`
          }

          if (path.includes(`{${sortKeyName}}`)) {
            // @ts-ignore
            requestParameters[`integration.request.path.${sortKeyName}`] = `'method.request.path.${sortKeyName}'`
          }


          const dynamoIntegration = new ApiGateway.AwsIntegration({
            service: 'dynamodb',
            action,
            options: {

              credentialsRole: methodRole,
              // credentialsPassthrough: true,

              requestParameters,

              // credentialsPassthrough: true,


              integrationResponses: options
                && options.integrationResponses ||
                // @ts-ignore
                methodMap[action].integrationResponses,

              requestTemplates: options &&
                options.requestTemplates ||
                // @ts-ignore
                methodMap[action].requestTemplates,
            }
          })



          addMethod(dynamoIntegration)

          // const apiMethod = this.api.root.resourceForPath(path)
          //   .addMethod(method, dynamoIntegration, {
          //     methodResponses: [{ statusCode: '200', }],
          //     authorizer: this.currentAuthorizer || undefined,
          //   })
          // apiMethod.resource.path




          if (options && Array.isArray(options.access)) {
            options.access.forEach(accessFn => accessFn(methodRole))
          }

        },
        sqs: (queue: SQS.Queue, options?: {
          access?: Function[],
        }) => {

          const methodRole = new IAM.Role(this, `${method}-${path}-integration-role`, {
            assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [
              IAM.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
            ]
          })


          // create an sqs integration
          const sqsIntegration = new ApiGateway.AwsIntegration({
            service: 'sqs',
            action: 'SendMessage',
            // path: `${Stack.of(this).account}/${queue.queueName}`,
            options: {
              credentialsRole: methodRole,
              requestParameters: {
                'integration.request.header.Content-Type': "'application/json'"
                // 'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
                // 'integration.request.querystring.Action': "'SendMessage'",
              },

              // https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html

              requestTemplates: {
                // send request body to sqs message
                // 'application/json': `Action=SendMessage&MessageBody=$input.body`

                // "MessageBody": "$input.path('$')",
                'application/json': `
                {
                  "MessageBody": "$util.urlEncode($util.escapeJavaScript($input.body).replaceAll("\\'","'"))",
                  "QueueUrl": "${queue.queueUrl}"
               }
                `
              },
              integrationResponses: [{
                statusCode: '200',
                responseTemplates: {
                  'application/json': `
                    #set($inputRoot = $input.path('$'))
                    $inputRoot`
                }
              }],
            }
          })

          addMethod(sqsIntegration)

          if (options && Array.isArray(options.access)) {
            options.access.forEach(accessFn => accessFn(methodRole))
          }


        },
        // sns(params) { },
        // stepFunctions(params) { },
        // s3(params) { },
        // mock(params) { },
        // http(params) { },
        fn(handlerFn: Lambda.Function) {
          // const integrationOptions = this.currentAuthorizer ? { authorizer: this.currentAuthorizer } : undefined;
          const lambdaIntegration = new ApiGateway.LambdaIntegration(handlerFn)
          addMethod(lambdaIntegration)
        },


      }
    }

    let code = handlerCode
    if (typeof code === 'object') {
      this.createMockIntegration(method, path, code)
      return
    }
    if (typeof code === 'function') code = code.toString()

    if (typeof code !== 'string') throw new Error("I wasn't able to resolve the code");

    if (code.startsWith('http')) {
      this.createHTTPIntegration(method, path, code)
      return
    }

    this.createLambdaIntegration(method, path, code, options);
    return
  }

  get(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('GET', path, handlerCode, options);

  }

  post(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('POST', path, handlerCode, options);

  }

  put(path: string, handlerCode: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('PUT', path, handlerCode, options);
  }

  patch(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('PATCH', path, handlerCode, options);
  }

  delete(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('DELETE', path, handlerCode, options);
  }

  options(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('OPTIONS', path, handlerCode, options);
  }

  head(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions) {
    return this.handleIntegration('HEAD', path, handlerCode, options);
  }

}

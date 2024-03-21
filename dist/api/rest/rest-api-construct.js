"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiConstruct = void 0;
const ApiGateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const IAM = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const compute_1 = require("../../compute");
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
class RestApiConstruct extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
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
    /**
     * enable cors for this API
     *
     * @author Diego Tores <diegotorres0303@gmail.com>
     *
     * @param {ApiGateway.CorsOptions} [options]
     * @return {*}  {RestApiConstruct}
     * @memberof RestApiConstruct
     */
    cors(options) {
        const defaultOptions = {
            allowOrigins: ApiGateway.Cors.ALL_ORIGINS,
            allowMethods: ApiGateway.Cors.ALL_METHODS,
            allowHeaders: [
                'Content-type', 'X-Amz-Date', 'X-Api-Key', 'Authorization',
                'Access-Controll-Allow-Headers', 'Access-Controll-Allow-Origins', 'Access-Controll-Allow-Methods',
            ],
            allowCredentials: true,
        };
        const corsOptions = options || defaultOptions;
        this.api.root.addCorsPreflight(corsOptions);
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
    authorizer(name, handlerCode) {
        const authFn = new compute_1.FunctionConstruct(this, `${name}_authorizer`);
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
    readFrom(construct) {
        if (!this.currentHandler)
            throw new Error('you need to create a handler function first');
        // if Dynamo
        const table = construct;
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
    writeTo(construct) {
        if (!this.currentHandler)
            throw new Error('you need to create a handler function first');
        // if Dynamo
        const table = construct;
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
    createLambdaIntegration(method, path, handlerCode, options) {
        console.log('use authorizer here', this.currentAuthorizer);
        const fn = new compute_1.FunctionConstruct(this, `${method}_${path}_handler`);
        fn.code(handlerCode, options);
        // [ ] deals with options
        // [ ] deal with layers
        const integrationOptions = this.currentAuthorizer ? { authorizer: this.currentAuthorizer } : undefined;
        const integration = new ApiGateway.LambdaIntegration(fn.handlerFn); // {proxy: true}
        this.api.root.resourceForPath(path)
            .addMethod(method, integration, integrationOptions);
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
    createMockIntegration(method, path, mockResponse) {
        const integration = new ApiGateway.MockIntegration({
            integrationResponses: [
                {
                    statusCode: '200',
                    responseTemplates: { 'application/json': JSON.stringify(mockResponse) }
                },
            ],
            passthroughBehavior: ApiGateway.PassthroughBehavior.NEVER,
            requestTemplates: { 'application/json': '{ "statusCode": 200 }' },
        });
        // const integrationOptions: ApiGateway.MethodOptions = this.currentAuthorizer ?
        //   { authorizer: this.currentAuthorizer } :
        //   undefined
        const integrationOptions = {
            authorizer: this.currentAuthorizer || undefined,
            methodResponses: [{ statusCode: '200', }]
        };
        this.api.root.resourceForPath(path)
            .addMethod(method, integration, integrationOptions);
    }
    createHTTPIntegration(method, path, url) {
        const integration = new ApiGateway.HttpIntegration(url);
        this.api.root.resourceForPath(path)
            .addMethod(method, integration, {
            methodResponses: [{ statusCode: '200', }],
            authorizer: this.currentAuthorizer || undefined,
        });
    }
    handleIntegration(method, path, handlerCode, options) {
        if (!handlerCode) {
            const addMethod = (integration) => {
                const apiMethod = this.api.root.resourceForPath(path)
                    .addMethod(method, integration, {
                    methodResponses: [{ statusCode: '200', }],
                    authorizer: this.currentAuthorizer || undefined,
                });
            };
            return {
                // [ ] how can I give access???
                dynamodb: (table, options) => {
                    var _a;
                    const partitionKeyName = table.schema().partitionKey.name;
                    const sortKeyName = (_a = table.schema().sortKey) === null || _a === void 0 ? void 0 : _a.name;
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
                    }` : ''}
                    
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
                    }` : ''}
                    
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
                    };
                    const methodRole = new IAM.Role(this, `${method}-${path}-integration-role`, {
                        assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
                    });
                    // docs on velocity utils and stuff https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html#context-variable-reference
                    let action = '';
                    if (method === 'GET') {
                        if (!path.includes(`{${partitionKeyName}}`) && !path.includes(`{${sortKeyName}}`)) {
                            action = 'Scan';
                        }
                        else if (path.includes(`{${partitionKeyName}}`) && !path.includes(`{${sortKeyName}}`)) {
                            action = 'Query';
                        }
                        else if (path.includes(`{${partitionKeyName}}`) && path.includes(`{${sortKeyName}}`)) {
                            action = 'GetItem';
                        }
                    }
                    else if (method === 'POST') {
                        action = 'PutItem';
                    }
                    else if (method === 'PUT') {
                        action = 'PutItem';
                    }
                    else if (method === 'DELETE') {
                        action = 'DeleteItem';
                    }
                    else if (method === 'PATCH') {
                        action = 'UpdateItem';
                    }
                    else {
                        throw new Error(`I don't know how to handle ${method}`);
                    }
                    const requestParameters = {};
                    if (path.includes(`{${partitionKeyName}}`)) {
                        requestParameters[`integration.request.path.${partitionKeyName}`] = `'method.request.path.${partitionKeyName}'`;
                    }
                    if (path.includes(`{${sortKeyName}}`)) {
                        requestParameters[`integration.request.path.${sortKeyName}`] = `'method.request.path.${sortKeyName}'`;
                    }
                    const dynamoIntegration = new ApiGateway.AwsIntegration({
                        service: 'dynamodb',
                        action,
                        options: {
                            credentialsRole: methodRole,
                            // credentialsPassthrough: true,
                            requestParameters,
                            integrationResponses: options
                                && options.integrationResponses ||
                                methodMap[action].integrationResponses,
                            requestTemplates: options &&
                                options.requestTemplates ||
                                methodMap[action].requestTemplates,
                        }
                    });
                    addMethod(dynamoIntegration);
                    // const apiMethod = this.api.root.resourceForPath(path)
                    //   .addMethod(method, dynamoIntegration, {
                    //     methodResponses: [{ statusCode: '200', }],
                    //     authorizer: this.currentAuthorizer || undefined,
                    //   })
                    // apiMethod.resource.path
                    if (options && Array.isArray(options.access)) {
                        options.access.forEach(accessFn => accessFn(methodRole));
                    }
                },
                sqs: (queue, options) => {
                    const methodRole = new IAM.Role(this, `${method}-${path}-integration-role`, {
                        assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com'),
                    });
                    // create an sqs integration
                    const sqsIntegration = new ApiGateway.AwsIntegration({
                        service: 'sqs',
                        action: 'SendMessage',
                        options: {
                            credentialsRole: methodRole,
                            requestParameters: {
                                'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
                                // 'integration.request.querystring.Action': "'SendMessage'",
                            },
                            // https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
                            // "DelaySeconds": 10,
                            // "MessageAttributes": { 
                            //    "string" : { 
                            //       "BinaryListValues": [ blob ],
                            //       "BinaryValue": blob,
                            //       "DataType": "string",
                            //       "StringListValues": [ "string" ],
                            //       "StringValue": "string"
                            //    }
                            // },
                            // "MessageSystemAttributes": { 
                            //    "string" : { 
                            //       "BinaryListValues": [ blob ],
                            //       "BinaryValue": blob,
                            //       "DataType": "string",
                            //       "StringListValues": [ "string" ],
                            //       "StringValue": "string"
                            //    }
                            // },
                            requestTemplates: {
                                // "MessageBody": "$input.path('$')",
                                'application/json': `
                {
                  "MessageBody": "$input.body",
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
                    });
                    addMethod(sqsIntegration);
                    if (options && Array.isArray(options.access)) {
                        options.access.forEach(accessFn => accessFn(methodRole));
                    }
                },
                // sns(params) { },
                // stepFunctions(params) { },
                // s3(params) { },
                // mock(params) { },
                // http(params) { },
                // fn(params) { },
            };
        }
        let code = handlerCode;
        if (typeof code === 'object') {
            this.createMockIntegration(method, path, code);
            return;
        }
        if (typeof code === 'function')
            code = code.toString();
        if (typeof code !== 'string')
            throw new Error("I wasn't able to resolve the code");
        if (code.startsWith('http')) {
            this.createHTTPIntegration(method, path, code);
            return;
        }
        this.createLambdaIntegration(method, path, code, options);
        return;
    }
    get(path, handlerCode, options) {
        return this.handleIntegration('GET', path, handlerCode, options);
    }
    post(path, handlerCode, options) {
        return this.handleIntegration('POST', path, handlerCode, options);
    }
    put(path, handlerCode, options) {
        return this.handleIntegration('PUT', path, handlerCode, options);
    }
    patch(path, handlerCode, options) {
        return this.handleIntegration('PATCH', path, handlerCode, options);
    }
    delete(path, handlerCode, options) {
        return this.handleIntegration('DELETE', path, handlerCode, options);
    }
    options(path, handlerCode, options) {
        return this.handleIntegration('OPTIONS', path, handlerCode, options);
    }
    head(path, handlerCode, options) {
        return this.handleIntegration('HEAD', path, handlerCode, options);
    }
}
exports.RestApiConstruct = RestApiConstruct;

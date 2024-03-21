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
exports.GraphQlApiConstruct = void 0;
const fs_1 = require("fs");
const AppSync = __importStar(require("aws-cdk-lib/aws-appsync"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
const compute_1 = require("../../compute");
// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync-readme.html
const { API_KEY, LAMBDA, } = AppSync.AuthorizationType;
class GraphQlApiConstruct extends constructs_1.Construct {
    get api() {
        if (this._api)
            return this._api;
        return this.createApi();
    }
    constructor(scope, id) {
        super(scope, id);
        this.fieldName = '';
        this.dataSourcesMap = new WeakMap();
        // private authorizerConfig: AppSync.AuthorizationMode = {
        this.authorizerConfig = {
            authorizationType: API_KEY,
            lambdaAuthorizerConfig: undefined,
        };
        this.currentOperation = '';
        this.schemaPath = '';
        this.name = id;
    }
    createApi() {
        this._api = new AppSync.GraphqlApi(this, this.name, {
            name: this.name,
            schema: AppSync.SchemaFile.fromAsset(this.schemaPath),
            // add the authorization config for a lambda function
            authorizationConfig: {
                defaultAuthorization: this.authorizerConfig,
            },
            xrayEnabled: true,
            logConfig: { retention: logs.RetentionDays.ONE_WEEK }
        });
        return this._api;
    }
    authorization(handlerCode, options) {
        console.log(handlerCode);
        console.log(options);
        const handler = new compute_1.FunctionConstruct(this, 'lambda_authorizer');
        handler.code(handlerCode);
        const { handlerFn } = handler;
        console.log('\n\n***handlerFn**\n\n');
        console.log(handlerFn.functionArn);
        // handlerFn.addPermission('LetAppSyncInvokeMe', {
        //   action: 'lambda:InvokeFunction',
        //   principal: new ServicePrincipal('appsync.amazonaws.com'),
        // })
        // handler.createServiceRole(`main_authorizer_role`, 'appsync.amazonaws.com')
        this.authorizerConfig.authorizationType = LAMBDA;
        // @ts-ignore
        this.authorizerConfig.lambdaAuthorizerConfig = {
            handler: handlerFn,
        };
        return this;
    }
    schema(value) {
        if (value.match(/^(.+)\/([^\/]+)$/g)) {
            this.schemaPath = value;
            return this;
        }
        const path = `./${this.name}.schema.gql`;
        (0, fs_1.writeFileSync)(path, value);
        this.schemaPath = path;
        // this.api = this.createApi(schemaPath);
        return this;
    }
    // gql operations
    createLambdaDataSource(name, handlerCode, options) {
        const resolverName = `${this.currentOperation}_${this.fieldName}`;
        if (!handlerCode)
            return this;
        const handler = new compute_1.FunctionConstruct(this, `${resolverName}_handler`);
        handler.code(handlerCode, options);
        const { invokeLambdaRole } = handler.createServiceRole(`${resolverName}_role`, 'appsync.amazonaws.com');
        const dataSource = new AppSync.LambdaDataSource(this, `${resolverName}_datasource`, {
            api: this.api,
            name: resolverName,
            lambdaFunction: handler.handlerFn,
            serviceRole: invokeLambdaRole,
        });
        dataSource.createResolver(`resolver_lambda_${name}`, {
            fieldName: name,
            typeName: this.currentOperation,
        });
        return this;
    }
    mutation(name, handlerCode, options) {
        this.currentOperation = 'Mutation';
        this.fieldName = name;
        this.createLambdaDataSource(name, handlerCode, options);
        return this;
    }
    query(name, handlerCode, options) {
        this.currentOperation = 'Query';
        this.fieldName = name;
        const resolverName = `${this.currentOperation}_${this.fieldName}`;
        if (!handlerCode)
            return this;
        const handler = new compute_1.FunctionConstruct(this, `${resolverName}_handler`);
        handler.code(handlerCode, options);
        const { invokeLambdaRole } = handler.createServiceRole(`${resolverName}_role`, 'appsync.amazonaws.com');
        const dataSource = new AppSync.LambdaDataSource(this, `${resolverName}_datasource`, {
            api: this.api,
            name: resolverName,
            lambdaFunction: handler.handlerFn,
            serviceRole: invokeLambdaRole,
        });
        dataSource.createResolver('resolver_lambda_test', {
            fieldName: name,
            typeName: this.currentOperation,
        });
        console.log('dataSource\n\n\n', dataSource);
        return this;
    }
    subscription(name) {
        this.currentOperation = 'Subscription';
        this.fieldName = name;
        return this;
    }
    done() {
        console.log(this.api);
        console.log(this.fieldName);
        console.log(this.currentOperation);
    }
    /**
     * create a new DynamoDB Table DataSource
     * to be used as datasource for resolvers
     *
     * @param {DynamoDB.Table} table
     * @return {*}
     * @memberof GraphQlApiConstruct
     */
    table(table) {
        // [ ] check if DataSource is already there
        if (this.dataSourcesMap)
            // [x] add a new DynamoDB DataSource
            // [x] select this datasource to be used on next operations
            this.currentDataSource = this.api.addDynamoDbDataSource(`${table.tableName}_dynamo_ds`, table);
        if (!this.currentDataSource)
            throw new Error('Empty DataSource');
        this.dataSourcesMap.set(table, this.currentDataSource);
        return this;
    }
}
exports.GraphQlApiConstruct = GraphQlApiConstruct;
// function getMappingFromOperation(operation: string, table: DynamoDB.Table): { req: AppSync.MappingTemplate, res: AppSync.MappingTemplate } {
//     if (operation === 'Query') {
//         return {
//             req: AppSync.MappingTemplate.dynamoDbScanTable(),
//             res:AppSync.MappingTemplate.dynamoDbResultList(),
//         }
//     }
//     if(operation === 'Mutation') {
//         return {
//             req: AppSync.MappingTemplate.dynamoDbPutItem(AppSync.PrimaryKey.partition(table.)),
//             res:AppSync.MappingTemplate.dynamoDbResultItem(),
//         }
//     }
// }

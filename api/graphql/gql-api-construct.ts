import { writeFileSync } from 'fs';
import * as AppSync from 'aws-cdk-lib/aws-appsync';
import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';

import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { FunctionOptions, FunctionConstruct } from '../../compute';


// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync-readme.html


const { API_KEY, LAMBDA, } = AppSync.AuthorizationType
export class GraphQlApiConstruct extends Construct {

  // private api?: AppSync.GraphqlApi;
  private _api?: AppSync.GraphqlApi;
  private get api(): AppSync.GraphqlApi {
    if (this._api) return this._api
    return this.createApi()

  }

  private name: string;

  private fieldName = '';
  private currentDataSource?: AppSync.DynamoDbDataSource
  private dataSourcesMap: WeakMap<Construct, AppSync.DynamoDbDataSource> = new WeakMap()

  // private authorizerConfig: AppSync.AuthorizationMode = {
  private authorizerConfig = {
    authorizationType: API_KEY,
    lambdaAuthorizerConfig: undefined,
  }

  private currentOperation = '';
  private schemaPath = '';

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.name = id;

  }

  private createApi(): AppSync.GraphqlApi {

    this._api = new AppSync.GraphqlApi(this, this.name, {
      name: this.name,
      schema: AppSync.SchemaFile.fromAsset(this.schemaPath),
      // add the authorization config for a lambda function
      authorizationConfig: {
        defaultAuthorization: this.authorizerConfig as AppSync.AuthorizationMode,
      },
      xrayEnabled: true,
      logConfig: { retention: logs.RetentionDays.ONE_WEEK }
    });

    return this._api;
  }

  authorization(handlerCode: string, options?: FunctionOptions) {
    console.log(handlerCode)
    console.log(options)
    const handler = new FunctionConstruct(this, 'lambda_authorizer')

    handler.code(handlerCode)


    const { handlerFn } = handler

    console.log('\n\n***handlerFn**\n\n')
    console.log(handlerFn.functionArn)

    // handlerFn.addPermission('LetAppSyncInvokeMe', {
    //   action: 'lambda:InvokeFunction',
    //   principal: new ServicePrincipal('appsync.amazonaws.com'),
    // })

    // handler.createServiceRole(`main_authorizer_role`, 'appsync.amazonaws.com')
    this.authorizerConfig.authorizationType = LAMBDA
    // @ts-ignore
    this.authorizerConfig.lambdaAuthorizerConfig = {
      handler: handlerFn,
    }


    return this;
  }


  schema(value: string): GraphQlApiConstruct {
    if (value.match(/^(.+)\/([^\/]+)$/g)) {
      this.schemaPath = value
      return this
    }

    const path = `./${this.name}.schema.gql`;
    writeFileSync(path, value);
    this.schemaPath = path;
    // this.api = this.createApi(schemaPath);
    return this

  }

  // gql operations
  private createLambdaDataSource(name: string, handlerCode?: string, options?: FunctionOptions) {

    const resolverName = `${this.currentOperation}_${this.fieldName}`

    if (!handlerCode) return this

    const handler = new FunctionConstruct(this, `${resolverName}_handler`)
    handler.code(handlerCode, options)
    const { invokeLambdaRole } = handler.createServiceRole(`${resolverName}_role`, 'appsync.amazonaws.com')

    const dataSource = new AppSync.LambdaDataSource(this, `${resolverName}_datasource`, {
      api: this.api,
      name: resolverName,
      lambdaFunction: handler.handlerFn,
      serviceRole: invokeLambdaRole,
    })

    dataSource.createResolver(`resolver_lambda_${name}`, {
      fieldName: name,
      typeName: this.currentOperation,
    })
    return this
  }

  mutation(name: string, handlerCode?: string, options?: FunctionOptions): GraphQlApiConstruct {
    this.currentOperation = 'Mutation';
    this.fieldName = name;

    this.createLambdaDataSource(name, handlerCode, options)

    return this;
  }

  query(name: string, handlerCode?: string, options?: FunctionOptions): GraphQlApiConstruct {
    this.currentOperation = 'Query';
    this.fieldName = name;

    const resolverName = `${this.currentOperation}_${this.fieldName}`

    if (!handlerCode) return this

    const handler = new FunctionConstruct(this, `${resolverName}_handler`)
    handler.code(handlerCode, options)
    const { invokeLambdaRole } = handler.createServiceRole(`${resolverName}_role`, 'appsync.amazonaws.com')

    const dataSource = new AppSync.LambdaDataSource(this, `${resolverName}_datasource`, {
      api: this.api,
      name: resolverName,
      lambdaFunction: handler.handlerFn,
      serviceRole: invokeLambdaRole,
    })

    dataSource.createResolver('resolver_lambda_test', {
      fieldName: name,
      typeName: this.currentOperation,
    })
    console.log('dataSource\n\n\n', dataSource)



    return this;
  }

  subscription(name: string): GraphQlApiConstruct {
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
  table(table: DynamoDB.Table) {
    // [ ] check if DataSource is already there
    if(this.dataSourcesMap)
    // [x] add a new DynamoDB DataSource
    // [x] select this datasource to be used on next operations
    this.currentDataSource = this.api.addDynamoDbDataSource(`${table.tableName}_dynamo_ds`, table)
    if(!this.currentDataSource) throw new Error('Empty DataSource')
    this.dataSourcesMap.set(table, this.currentDataSource)
    return this
  }

  // resolvers

  // toDB(table: DynamoDB.Table): GraphQlApiConstruct {
  //     if (!this.api) throw new Error('you must create an api first by calling the schema() method')

  //     const dataSourceName = `${this.currentOperation}_DynamoDataSource`
  //     const resolverName = `${this.currentOperation}_DynamoResolver`
  //     const dynamoDataSource = this.api.addDynamoDbDataSource(dataSourceName, table)

  //     const reqMappingTemplate = getMappingFromOperation(this.currentOperation)

  //     dynamoDataSource.createResolver(resolverName, {
  //         typeName: this.currentOperation,
  //         fieldName: this.fieldName,
  //         requestMappingTemplate: AppSync.MappingTemplate.dynamoDbPutItem()

  //     })

  //     return this
  // }


}


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
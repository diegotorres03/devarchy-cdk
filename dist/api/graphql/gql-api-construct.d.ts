import * as DynamoDB from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { FunctionOptions } from '../../compute';
export declare class GraphQlApiConstruct extends Construct {
    private _api?;
    private get api();
    private name;
    private fieldName;
    private currentDataSource?;
    private dataSourcesMap;
    private authorizerConfig;
    private currentOperation;
    private schemaPath;
    constructor(scope: Construct, id: string);
    private createApi;
    authorization(handlerCode: string, options?: FunctionOptions): this;
    schema(value: string): GraphQlApiConstruct;
    private createLambdaDataSource;
    mutation(name: string, handlerCode?: string, options?: FunctionOptions): GraphQlApiConstruct;
    query(name: string, handlerCode?: string, options?: FunctionOptions): GraphQlApiConstruct;
    subscription(name: string): GraphQlApiConstruct;
    done(): void;
    /**
     * create a new DynamoDB Table DataSource
     * to be used as datasource for resolvers
     *
     * @param {DynamoDB.Table} table
     * @return {*}
     * @memberof GraphQlApiConstruct
     */
    table(table: DynamoDB.Table): this;
}

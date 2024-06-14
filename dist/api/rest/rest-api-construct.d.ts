import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import * as Dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as SQS from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { FunctionOptions } from '../../compute';
/**
 *
 * @author Diego Tores <diegotorres0303@gmail.com>
 *
 * @export
 * @class RestApiConstruct
 * @extends {Construct}
 */
export declare class RestApiConstruct extends Construct {
    private currentAuthorizer?;
    private currentHandler?;
    api: ApiGateway.RestApi;
    private corsOptions;
    constructor(scope: Construct, id: string);
    /**
     * enable cors for this API
     *
     * @author Diego Tores <diegotorres0303@gmail.com>
     *
     * @param {ApiGateway.CorsOptions} [options]
     * @return {*}  {RestApiConstruct}
     * @memberof RestApiConstruct
     */
    cors(options?: ApiGateway.CorsOptions): RestApiConstruct;
    /**
     * add a webapp construct on cors
     *
     * @param {WebAppConstruct} webapp
     * @return {*}  {RestApiConstruct}
     * @memberof RestApiConstruct
     */
    /**
     * create an authorizer and use it in the followin lambdas until a new authorizer is created
     *
     * @author Diego Tores <diegotorres0303@gmail.com>
     *
     * @param {string} handlerCode
     * @return {*}  {RestApiConstruct}
     * @memberof RestApiConstruct
     */
    authorizer(name: string, handlerCode: string): RestApiConstruct;
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
    readFrom(construct: Construct): RestApiConstruct;
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
    writeTo(construct: Construct): RestApiConstruct;
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
    private createLambdaIntegration;
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
    private createMockIntegration;
    private createHTTPIntegration;
    private handleIntegration;
    get(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    post(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    put(path: string, handlerCode: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    patch(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    delete(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    options(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
    head(path: string, handlerCode?: string | Function | Object, options?: FunctionOptions): {
        dynamodb: (table: Dynamo.Table, options?: {
            access?: Function[] | undefined;
            requestTemplates?: {
                [contentType: string]: string;
            } | undefined;
            integrationResponses?: {
                statusCode: string;
                responseTemplates: {
                    [contentType: string]: string;
                };
            }[] | undefined;
        } | undefined) => void;
        sqs: (queue: SQS.Queue, options?: {
            access?: Function[] | undefined;
        } | undefined) => void;
        fn(handlerFn: Lambda.Function): void;
    } | undefined;
}

import { aws_lambda as Lambda, aws_ec2 as EC2, Duration } from 'aws-cdk-lib';
import * as IAM from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface FunctionOptions {
    readonly name?: string;
    readonly env?: {
        [key: string]: string;
    };
    readonly timeout?: Duration;
    readonly access?: Function[];
    readonly vpc?: EC2.Vpc | string;
    readonly securityGroupIds?: string[];
    readonly layers?: {
        name: string;
        path: string;
    }[];
}
export declare class FunctionConstruct extends Construct {
    get arn(): string;
    layers: {
        [layerName: string]: Lambda.LayerVersion;
    };
    layersToUse: Array<Lambda.LayerVersion>;
    handlerFn: Lambda.Function;
    private functionName;
    constructor(scope: Construct, id: string);
    /**
     * create a layer from local file, s3 url or existing layer construct
     *
     * @author Diego Torres
     * @memberof FunctionConstruct
     * @param {string} name - layer friendly name
     * @param {string} path - local or s3 path to layer folder
     * @return {Lambda.LayerVersion}
     */
    createLayer(name: string, path: string): Lambda.LayerVersion;
    useLayer(name: string): void;
    /**
     *
     * @deprecated use .code() instead
     * @param {string} functionCode
     * @param {FunctionOptions} [options={}]
     * @return {*}
     * @memberof FunctionConstruct
     */
    handler(functionCode: string, options?: FunctionOptions): void;
    /**
     * here is where you add or reference the lambda code
     *
     * @param {string} functionCode - function code in the target language as a string,
     * or a ./path/to/file or s3://path/to/file
     * @param {FunctionOptions} options
     * @return {*}
     * @memberof FunctionConstruct
     */
    code(functionCode: string, options?: FunctionOptions): void;
    /**
     * this tell wich will be the trigger or source of the event for lambda to handle
     *
     * @template T
     * @param {Construct} construct
     * @memberof FunctionConstruct
     */
    trigger(construct: Construct): void;
    createServiceRole(name: string, servicePrincipal: string): {
        invokeLambdaRole: IAM.Role;
        involeLambdaPolicy: IAM.PolicyDocument;
    };
}

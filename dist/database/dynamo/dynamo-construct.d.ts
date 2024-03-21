import { aws_dynamodb as Dynamo, aws_dax as Dax } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class DynamoCostruct extends Construct {
    table?: Dynamo.Table;
    daxCache?: Dax.CfnCluster;
    private params;
    constructor(scope: Construct, id: string);
    addKeys(partitionKey: string, sortKey?: string): void;
    end(): void;
    addIndex(): void;
    addDax(): void;
    createDax(subnetIds: string[], securityGroupIds: string[]): void;
    on(eventName: string, handlerCode: string): void;
}

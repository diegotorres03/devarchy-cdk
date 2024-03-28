import { aws_cognito as Cognito } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class AuthConstruct extends Construct {
    userPool: Cognito.UserPool;
    constructor(scope: Construct, id: string, props?: any);
    addClient({ domainPrefix, redirectUri, callbackUrls, }: {
        domainPrefix: any;
        redirectUri: any;
        callbackUrls: any;
    }): void;
}

import { aws_cognito as Cognito } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class AuthConstruct extends Construct {
    userPool: Cognito.UserPool;
    constructor(scope: Construct, id: string, props?: any);
    addClient({ domainPrefix, redirectUri, callbackUrls, }: {
        domainPrefix: string;
        redirectUri: string;
        callbackUrls: string[];
    }): void;
}

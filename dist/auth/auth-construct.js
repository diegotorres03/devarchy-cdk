"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthConstruct = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
class AuthConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.userPool = new aws_cdk_lib_1.aws_cognito.UserPool(this, 'UserPool', {
            signInCaseSensitive: false,
            signInAliases: {
                email: true,
                username: true,
                phone: true,
            },
            selfSignUpEnabled: true,
            autoVerify: {
                email: true,
                phone: true,
            },
            userVerification: {
                // email link flow
                // emailStyle: Cognito.VerificationEmailStyle.LINK,
                // emailSubject: 'Invite to join our awesome app!',
                // emailBody: 'You have been invited to join our awesome app! {##Verify Email##}',    
                // // token flow
                emailSubject: 'Verify your email',
                emailBody: 'Thanks for signing up! Your verification code is {####}',
                emailStyle: aws_cdk_lib_1.aws_cognito.VerificationEmailStyle.CODE,
                smsMessage: 'Thanks for signing up! Your verification code is {####}',
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                fullname: {
                    required: true,
                    mutable: false,
                }
            },
            keepOriginal: {
                email: true,
                phone: true,
            },
        });
        // this.userPool.addTrigger()
    }
    addClient({ domainPrefix, redirectUri, callbackUrls, }) {
        const client = this.userPool.addClient('WebClient', {
            oAuth: {
                flows: { implicitCodeGrant: true },
                callbackUrls: [...callbackUrls] //['https://test.easyarchery.net']
            }
        });
        const domain = this.userPool.addDomain('Domain', {
            cognitoDomain: {
                domainPrefix: domainPrefix // 'easyarchery-auth',
            }
        });
        const signInUrl = domain.signInUrl(client, {
            redirectUri: redirectUri // 'https://test.easyarchery.net'
        });
        new aws_cdk_lib_1.CfnOutput(this, 'SignInUrl', { value: signInUrl });
    }
}
exports.AuthConstruct = AuthConstruct;

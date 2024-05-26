import {
  CfnOutput,
  aws_cognito as Cognito,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha'

export class AuthConstruct extends Construct {

  userPool: Cognito.UserPool

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id)
    this.userPool = new Cognito.UserPool(this, 'UserPool', {
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
        emailStyle: Cognito.VerificationEmailStyle.CODE,
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
    })

    // this.userPool.addTrigger()
  }

  addClient({
    domainPrefix,
    redirectUri,
    callbackUrls,
  }: {domainPrefix: string, redirectUri: string, callbackUrls: string[]}) {

    const client = this.userPool.addClient('WebClient', {
      oAuth: {
        flows: { implicitCodeGrant: true },
        callbackUrls: [...callbackUrls] //['https://test.easyarchery.net']
      }
    })
    const domain = this.userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: domainPrefix // 'easyarchery-auth',
      }
    })

    const signInUrl = domain.signInUrl(client, {
      redirectUri: redirectUri // 'https://test.easyarchery.net'
    })

    new CfnOutput(this, 'SignInUrl', { value: signInUrl })
  }


}

import * as ApiGatewayV2 from 'aws-cdk-lib/aws-apigatewayv2'
import {
  WebSocketAwsIntegration,
  WebSocketAwsIntegrationProps,
  WebSocketMockIntegration,
  WebSocketLambdaIntegration,
} from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as Lambda from 'aws-cdk-lib/aws-lambda'

import { Construct } from 'constructs'
import { CfnOutput, Stack } from 'aws-cdk-lib'
import { FunctionConstruct, FunctionOptions } from '../../compute'

export class WebSocketApiConstruct extends Construct {


  api: ApiGatewayV2.WebSocketApi

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.api = new ApiGatewayV2.WebSocketApi(this, id + '_ws_api')


    new ApiGatewayV2.WebSocketStage(this, 'dev', {
      webSocketApi: this.api,
      stageName: id + '_dev_stage',
      autoDeploy: true,
    })

    new CfnOutput(this, 'websocket_url', { value: this.api.apiEndpoint })

  
  }


  addRoute(routeName: string, handler: Lambda.Function, ) {
    // const onConnect = new FunctionConstruct(this, routeName)
    // onConnect.code(handler.toString())
    
    this.api.addRoute(routeName, {
      integration: new WebSocketLambdaIntegration(routeName, handler)
    })
    
    // [ ] add support for dynamo, sns, sqs and so on

  }

  // authorizer()

}
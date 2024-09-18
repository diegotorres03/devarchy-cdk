import {
  CfnOutput,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { FunctionConstruct } from '../../compute'
import { Effect, IGrantable, PolicyStatement } from 'aws-cdk-lib/aws-iam'


const region = process.env.AWS_REGION || "us-east-2"

export class TinyVectorDBConstruct extends Construct {


  /**
   * This one runs the embeded lancedb
   *
   * @type {FunctionConstruct}
   * @memberof TinyVectorDBConstruct
   */
  db: FunctionConstruct

  /**
   * Arn for lambda handler
   *
   * @type {string}
   * @memberof TinyVectorDBConstruct
   */
  invokeArn: string

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id)

    // [x] create function layer and handler
    this.db = new FunctionConstruct(this, `${id}_handler`)

    // HACK: this pats are assuming this is installed using NPM
    // [ ] find a way to use a relative path instead
    this.db.createLayer('TinyVectorDB_lib', './node_modules/devarchy-cdk/database/tiny-vector/layers/tiny-vector-db-core')
    this.db.code('./node_modules/devarchy-cdk/database/tiny-vector/functions/main')
    // this.db.code('./lib/tiny-vector-db/functions/main')
    
    // [x] add permision to Bedrock

    this.db.handlerFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${region}::foundation-model/amazon.titan-*`,
        ],
        effect: Effect.ALLOW,
      })
    )
    this.invokeArn = this.db.handlerFn.functionArn
    new CfnOutput(this, `${id}_Arn`, {
      value: this.db.handlerFn.functionArn,
      description: "Tiny Vector DB Arn",
      exportName: id,
    })

  }


  grantRead(identity: IGrantable) {
    // [ ] Grand read access
  }


  grantWrite(identity: IGrantable) {
    // [ ] Grand write access
  }

  grantReadWrite(identity: IGrantable) {
    this.grantRead(identity)
    this.grantReadWrite(identity)
  }

}

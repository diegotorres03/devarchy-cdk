import {
  aws_iam as iam,
  aws_dynamodb as Dynamo,
  aws_dax as Dax,
  // aws_lambda as Lambda,
  // aws_lambda_event_sources as LambdaEventSources,
  CfnOutput,
  PhysicalName,
  //
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { FunctionConstruct } from '../../compute';


const unimplementedError = 'this method hasn`t been implemented, feel free to contribute';


export class DynamoCostruct extends Construct {

  // static operations = {
  //     INSERT: 'Insert',
  //     MODIFY: 'Modify',
  //     DELETE: 'Delete',
  // };

  public table?: Dynamo.Table;
  public daxCache?: Dax.CfnCluster;

  private params: Dynamo.TableProps;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.params = {
      tableName: PhysicalName.GENERATE_IF_NEEDED,
      partitionKey: {},
    } as Dynamo.TableProps;
  }

  addKeys(partitionKey: string, sortKey?: string) {
    const { STRING } = Dynamo.AttributeType;

    this.params = {
      tableName: PhysicalName.GENERATE_IF_NEEDED,
      billingMode: Dynamo.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: partitionKey,
        type: STRING,
      },
      sortKey: sortKey ? ({ name: sortKey, type: STRING }) : undefined,
      stream: Dynamo.StreamViewType.NEW_AND_OLD_IMAGES, // [ ] enable the hability to change this
    } as Dynamo.TableProps;

    this.table = new Dynamo.Table(this, 'testTable', this.params);

    new CfnOutput(this, 'tableName', {
      value: this.table.tableName,
      // exportName: 'tableName'
    });
  }

  end() {
    // this.params = {...this.params, billingMode}

    this.table = new Dynamo.Table(this, 'testTable', this.params);
  }

  addIndex() {
    throw new Error(unimplementedError);
  }

  addDax() {
    throw new Error(unimplementedError);
  }

  createDax(subnetIds: string[], securityGroupIds: string[]) {
    if (!this.table) return console.warn('can`t create a dax index without creating a table first');

    // [ ] Dax?
    const daxRole = new iam.Role(this, 'DaxRole', {
      assumedBy: new iam.ServicePrincipal('dax.amazonaws.com'),
      description: 'service role for DAX',
    });

    daxRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:*'],
      resources: [this.table.tableArn],
    }));

    const daxSubnetGroup = new Dax.CfnSubnetGroup(this, 'DaxSubnetGroup', {
      description: 'private subnet group for DAX',
      subnetIds: subnetIds, // [] create a subnet and get the id
      subnetGroupName: 'dax-test-group-2',
    });

    this.daxCache = new Dax.CfnCluster(this, 'DaxCluster', {
      iamRoleArn: daxRole.roleArn,
      nodeType: 'dax.t3.small',
      replicationFactor: 1,
      securityGroupIds: securityGroupIds,
      subnetGroupName: daxSubnetGroup.ref,
    });


    new CfnOutput(this, 'daxEndpoint', {
      value: this.daxCache.attrClusterDiscoveryEndpointUrl,
      // exportName: 'daxClusterEndpointUrl'
    });

  }

  on(eventName: string, handlerCode: string) {
    const fn = new FunctionConstruct(this, `${eventName}_handler`);
    fn.handler(handlerCode);
    if (!this.table) return;
    fn.trigger(this.table);
  }

  //   addStreamHandler(scope: string | string[], code: Function | string, options: any) {
  //     throw new Error(unimplementedError);
  //     // [ ] enable streams if not enabled already
  //     // [ ] create lambda
  //     // [ ] set lambda as handler for dynamo
  //   }

}


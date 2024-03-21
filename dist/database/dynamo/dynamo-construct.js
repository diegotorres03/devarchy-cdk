"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoCostruct = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const compute_1 = require("../../compute");
const unimplementedError = 'this method hasn`t been implemented, feel free to contribute';
class DynamoCostruct extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        this.params = {
            tableName: aws_cdk_lib_1.PhysicalName.GENERATE_IF_NEEDED,
            partitionKey: {},
        };
    }
    addKeys(partitionKey, sortKey) {
        const { STRING } = aws_cdk_lib_1.aws_dynamodb.AttributeType;
        this.params = {
            tableName: aws_cdk_lib_1.PhysicalName.GENERATE_IF_NEEDED,
            billingMode: aws_cdk_lib_1.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: partitionKey,
                type: STRING,
            },
            sortKey: sortKey ? ({ name: sortKey, type: STRING }) : undefined,
            stream: aws_cdk_lib_1.aws_dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // [ ] enable the hability to change this
        };
        this.table = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'testTable', this.params);
        new aws_cdk_lib_1.CfnOutput(this, 'tableName', {
            value: this.table.tableName,
            // exportName: 'tableName'
        });
    }
    end() {
        // this.params = {...this.params, billingMode}
        this.table = new aws_cdk_lib_1.aws_dynamodb.Table(this, 'testTable', this.params);
    }
    addIndex() {
        throw new Error(unimplementedError);
    }
    addDax() {
        throw new Error(unimplementedError);
    }
    createDax(subnetIds, securityGroupIds) {
        if (!this.table)
            return console.warn('can`t create a dax index without creating a table first');
        // [ ] Dax?
        const daxRole = new aws_cdk_lib_1.aws_iam.Role(this, 'DaxRole', {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal('dax.amazonaws.com'),
            description: 'service role for DAX',
        });
        daxRole.addToPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
            actions: ['dynamodb:*'],
            resources: [this.table.tableArn],
        }));
        const daxSubnetGroup = new aws_cdk_lib_1.aws_dax.CfnSubnetGroup(this, 'DaxSubnetGroup', {
            description: 'private subnet group for DAX',
            subnetIds: subnetIds,
            subnetGroupName: 'dax-test-group-2',
        });
        this.daxCache = new aws_cdk_lib_1.aws_dax.CfnCluster(this, 'DaxCluster', {
            iamRoleArn: daxRole.roleArn,
            nodeType: 'dax.t3.small',
            replicationFactor: 1,
            securityGroupIds: securityGroupIds,
            subnetGroupName: daxSubnetGroup.ref,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'daxEndpoint', {
            value: this.daxCache.attrClusterDiscoveryEndpointUrl,
            // exportName: 'daxClusterEndpointUrl'
        });
    }
    on(eventName, handlerCode) {
        const fn = new compute_1.FunctionConstruct(this, `${eventName}_handler`);
        fn.handler(handlerCode);
        if (!this.table)
            return;
        fn.trigger(this.table);
    }
}
exports.DynamoCostruct = DynamoCostruct;

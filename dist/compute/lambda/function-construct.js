"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionConstruct = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const IAM = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const { warn } = console;
class FunctionConstruct extends constructs_1.Construct {
    // layers: Map<string, Lambda.LayerVersion> = new Map();
    // layersToUse: Set<Lambda.LayerVersion> = new Set();
    get arn() {
        return this.handlerFn.functionArn;
    }
    constructor(scope, id) {
        super(scope, id);
        this.layers = {};
        this.layersToUse = [];
        this.functionName = id;
    }
    /**
     * create a layer from local file, s3 url or existing layer construct
     *
     * @author Diego Torres
     * @memberof FunctionConstruct
     * @param {string} name - layer friendly name
     * @param {string} path - local or s3 path to layer folder
     * @return {Lambda.LayerVersion}
     */
    createLayer(name, path) {
        console.info(`creating layer ${name} using ${path}`);
        const layer = new aws_cdk_lib_1.aws_lambda.LayerVersion(this, name, {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            code: aws_cdk_lib_1.aws_lambda.Code.fromAsset(path), // './layers/dax'
        });
        this.layers[name] = layer;
        this.useLayer(name);
        return layer;
    }
    useLayer(name) {
        const layer = this.layers[name];
        if (!layer)
            return warn(`layer ${name} not found!`);
        this.layersToUse.push(layer);
    }
    /**
     *
     * @deprecated use .code() instead
     * @param {string} functionCode
     * @param {FunctionOptions} [options={}]
     * @return {*}
     * @memberof FunctionConstruct
     */
    handler(functionCode, options = {}) {
        console.warn('deprecated, use .code instead');
        return this.code(functionCode, options);
    }
    /**
     * here is where you add or reference the lambda code
     *
     * @param {string} functionCode - function code in the target language as a string,
     * or a ./path/to/file or s3://path/to/file
     * @param {FunctionOptions} options
     * @return {*}
     * @memberof FunctionConstruct
     */
    code(functionCode, options = {}) {
        var _a;
        const name = (_a = options.name) !== null && _a !== void 0 ? _a : this.functionName;
        let vpc;
        let sgs;
        if (options.vpc) {
            vpc = options.vpc === 'default' ?
                aws_cdk_lib_1.aws_ec2.Vpc.fromLookup(this, 'default-vpc-' + name, { isDefault: true }) :
                options.vpc;
            sgs = [aws_cdk_lib_1.aws_ec2.SecurityGroup.fromLookupByName(this, 'defaultSG-' + name, 'default', vpc)];
            //  sgs = Array.isArray(options.securityGroupIds) ? options.securityGroupIds
            //     .map(sgId => EC2.SecurityGroup.fromSecurityGroupId(this, 'sgid', sgId)) : []
            // console.log('sgids', options.securityGroupIds)
            // console.log(sgs)
        }
        const lambdaParams = {
            runtime: aws_cdk_lib_1.aws_lambda.Runtime.NODEJS_LATEST,
            code: getCode(functionCode),
            timeout: options.timeout || aws_cdk_lib_1.Duration.seconds(30),
            layers: this.layersToUse,
            // code: Lambda.Code.fromAsset(lambdaDef.path),
            allowPublicSubnet: vpc ? true : undefined,
            securityGroups: sgs,
            handler: 'index.handler',
            vpc,
            environment: Object.assign({}, options.env),
        };
        this.handlerFn = new aws_cdk_lib_1.aws_lambda.Function(this, name + '-handler', lambdaParams);
        // granting access to external resources
        if (Array.isArray(options.access)) {
            options.access.forEach(accessFn => accessFn(this.handlerFn));
        }
        // creating and adding layers
        if (options.layers) {
            options.layers.forEach(layer => this.createLayer(layer.name, layer.path));
        }
        if (!this.handlerFn)
            throw new Error('something went wrong, this.handlerFn should not be empty');
        // if (options && Array.isArray(options.access)) {
        //     options.access.forEach(fn => fn(lambda));
        // }
        // return this.handlerFn;
    }
    /**
     * this tell wich will be the trigger or source of the event for lambda to handle
     *
     * @template T
     * @param {Construct} construct
     * @memberof FunctionConstruct
     */
    trigger(construct) {
        var _a;
        console.log(construct.constructor.name);
        if (!this.handlerFn)
            return console.error('handler function not defined');
        // if Dynamo
        const table = construct;
        (_a = this.handlerFn) === null || _a === void 0 ? void 0 : _a.addEventSource(new aws_cdk_lib_1.aws_lambda_event_sources.DynamoEventSource(table, {
            startingPosition: aws_cdk_lib_1.aws_lambda.StartingPosition.TRIM_HORIZON,
        }));
        table.grantStreamRead(this.handlerFn);
    }
    createServiceRole(name, servicePrincipal) {
        const involeLambdaPolicy = new IAM.PolicyDocument({
            statements: [
                new IAM.PolicyStatement({
                    effect: IAM.Effect.ALLOW,
                    actions: ['lambda:InvokeFunction'],
                    resources: [this.arn],
                }),
            ],
        });
        const invokeLambdaRole = new IAM.Role(this, name, {
            assumedBy: new IAM.ServicePrincipal(servicePrincipal),
            inlinePolicies: {
                InvokeLambda: involeLambdaPolicy,
            },
        });
        return { invokeLambdaRole, involeLambdaPolicy };
    }
}
exports.FunctionConstruct = FunctionConstruct;
function getCode(source) {
    if (source.includes('s3://')) {
        // const bucket = ''
        // const key = ''
        // return Lambda.Code.fromBucket(bucket, key)
        console.warn('this method hasn`t being implemented');
    }
    if (source.includes('./'))
        return aws_cdk_lib_1.aws_lambda.Code.fromAsset(source);
    //   const functionCodeStr = source
    // if (source.includes('exports.handler = ')) {
    //   // console.log('full function')
    //   code = `(${source})()`;
    // } else {
    //   // console.log('handler function')
    //   code = `(function() {
    //           exports.handler = ${source}
    //       })()`;
    //   // console.log(code)
    // }
    const code = source.includes('exports.handler = ') ? source : `exports.handler = ${source}`;
    return aws_cdk_lib_1.aws_lambda.Code.fromInline(code);
}

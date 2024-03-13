import {
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_ec2 as EC2,
  aws_dynamodb as Dynamo,
  RemovalPolicy,
  Duration,
} from 'aws-cdk-lib';
import * as IAM from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';

const { warn } = console;

// function exampleUsage() {
//     const fn = new FunctionConstruct()
//     fn
//         .layer('s3:/bucket/folder/key')
//         .layer('./local/paht/to/assets')
//         .layer(function someFunction(params){console.log(params)})

//     fn.handler(function handler(event, context) {
//         console.log(event, runInNewContext)
//         return {success: true}
//     })

// }

export interface FunctionOptions {
  readonly name?: string;
  readonly env?: { [key: string]: string };
  readonly timeout?: Duration;
  // readonly access: Function[];
  readonly vpc?: EC2.Vpc | string;
  readonly securityGroupIds?: string[];
  readonly layers?: string[]; // Lambda.ILayerVersion[];
}

export class FunctionConstruct extends Construct {

  // layers: Map<string, Lambda.LayerVersion> = new Map();
  // layersToUse: Set<Lambda.LayerVersion> = new Set();

  get arn(): string {
    return this.handlerFn.functionArn
  }

  layers: { [layerName: string]: Lambda.LayerVersion } = {};
  layersToUse: Array<Lambda.LayerVersion> = [];

  // this definition in only to avoid initialization error
  // src/compute/lambda/function-construct.ts:45:3 - error TS2564: Property 'handlerFn' has no initializer and is not definitely assigned in the constructor.
  // @ts-ignore
  handlerFn: Lambda.Function
  //   handlerFn: Lambda.Function = new Lambda.Function(this, 'empty-fn' + Date.now(), {
  //   runtime: Lambda.Runtime.NODEJS_16_X,
  //   code: Lambda.Code.fromInline('export.handler = event => {console.log(event); reutrn {success:true}}'),
  //   handler: 'index.handler',
  // });

  private functionName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
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
  createLayer(name: string, path: string): Lambda.LayerVersion {
    console.info(`creating layer ${name} using ${path}`);
    const layer = new Lambda.LayerVersion(this, name, {
      removalPolicy: RemovalPolicy.DESTROY,
      code: Lambda.Code.fromAsset(path), // './layers/dax'
    });
    this.layers[name] = layer;
    this.useLayer(name);
    return layer;
  }

  useLayer(name: string) {
    const layer = this.layers[name];
    if (!layer) return warn(`layer ${name} not found!`);
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
  handler(functionCode: string, options: FunctionOptions = {}) {
    console.warn('deprecated, use .code instead')
    return this.code(functionCode, options)
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
  code(functionCode: string, options: FunctionOptions = {}) {
    const name = options.name ?? this.functionName;

    let vpc;
    let sgs;
    if (options.vpc) {
      vpc = options.vpc === 'default' ?
        EC2.Vpc.fromLookup(this, 'default-vpc-' + name, { isDefault: true }) :
        options.vpc as EC2.Vpc;
      sgs = [EC2.SecurityGroup.fromLookupByName(this, 'defaultSG-' + name, 'default', vpc)];
      //  sgs = Array.isArray(options.securityGroupIds) ? options.securityGroupIds
      //     .map(sgId => EC2.SecurityGroup.fromSecurityGroupId(this, 'sgid', sgId)) : []
      // console.log('sgids', options.securityGroupIds)
      // console.log(sgs)
    }


    const lambdaParams = {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: getCode(functionCode),
      timeout: options.timeout || Duration.seconds(30),
      layers: this.layersToUse,
      // code: Lambda.Code.fromAsset(lambdaDef.path),
      allowPublicSubnet: vpc ? true : undefined,
      securityGroups: sgs,
      handler: 'index.handler',
      vpc,
      environment: { ...options.env },
    } as Lambda.FunctionProps;

    this.handlerFn = new Lambda.Function(this, name + '-handler', lambdaParams);

    if (!this.handlerFn) throw new Error('something went wrong, this.handlerFn should not be empty');

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
  trigger(construct: Construct) {
    console.log(construct.constructor.name);
    if (!this.handlerFn) return console.error('handler function not defined');

    // if Dynamo
    const table = construct as Dynamo.Table;
    this.handlerFn?.addEventSource(new LambdaEventSources.DynamoEventSource(table, {
      startingPosition: Lambda.StartingPosition.TRIM_HORIZON,
    }));

    table.grantStreamRead(this.handlerFn);
  }

  createServiceRole(name: string, servicePrincipal: string) {
    const involeLambdaPolicy = new IAM.PolicyDocument({
      statements: [
        new IAM.PolicyStatement({
          effect: IAM.Effect.ALLOW,
          actions: ['lambda:InvokeFunction'],
          resources: [this.arn],
        }),
      ],
    })

    const invokeLambdaRole = new IAM.Role(this, name, {
      assumedBy: new IAM.ServicePrincipal(servicePrincipal),
      inlinePolicies: {
        InvokeLambda: involeLambdaPolicy,
      },
    })
    return { invokeLambdaRole, involeLambdaPolicy }
  }

}


function getCode(source: string) {
  if (source.includes('s3://')) {
    // const bucket = ''
    // const key = ''
    // return Lambda.Code.fromBucket(bucket, key)
    console.warn('this method hasn`t being implemented');
  }

  if (source.includes('./')) return Lambda.Code.fromAsset(source);

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

  return Lambda.Code.fromInline(code);
}

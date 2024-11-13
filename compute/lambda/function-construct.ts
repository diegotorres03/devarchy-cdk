import {
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_ec2 as EC2,
  aws_dynamodb as Dynamo,
  RemovalPolicy,
  Duration,
} from 'aws-cdk-lib';
import * as IAM from 'aws-cdk-lib/aws-iam'
import { Architecture, Function, IDestination } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import {
  SqsDestination,
  EventBridgeDestination,
  SnsDestination,
  LambdaDestination,
} from 'aws-cdk-lib/aws-lambda-destinations'
import { Queue } from 'aws-cdk-lib/aws-sqs';


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
  readonly access?: Function[];
  readonly vpc?: EC2.Vpc | string;
  readonly memorySize?: Number | undefined
  readonly securityGroupIds?: string[];
  readonly runtime?: Lambda.Runtime;
  readonly layers?: { name: string, path: string }[]; // Lambda.ILayerVersion[];
}

export class FunctionConstruct extends Construct implements IAM.IGrantable {

  static layers: { [layerName: string]: Lambda.LayerVersion } = {};

  grantPrincipal: IAM.IPrincipal;

  // layers: Map<string, Lambda.LayerVersion> = new Map();
  // layersToUse: Set<Lambda.LayerVersion> = new Set();

  get arn(): string {
    return this.handlerFn.functionArn
  }

  layersToUse: Array<Lambda.LayerVersion> = [];

  // this definition in only to avoid initialization error
  // src/compute/lambda/function-construct.ts:45:3 - error TS2564: Property 'handlerFn' has no initializer and is not definitely assigned in the constructor.


  // [ ] Inicializar esta lambda asi sea con un hello world pa no romper cosas y bacano q tenga algo por defecto

  // @ts-ignore
  handlerFn: Lambda.Function
  //   handlerFn: Lambda.Function = new Lambda.Function(this, 'empty-fn' + Date.now(), {
  //   runtime: Lambda.Runtime.NODEJS_16_X,
  //   code: Lambda.Code.fromInline('export.handler = event => {console.log(event); reutrn {success:true}}'),
  //   handler: 'index.handler',
  // });

  onSuccess?: IDestination

  onFailure?: IDestination

  private functionName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.functionName = id;

    this.grantPrincipal = new IAM.ServicePrincipal('lambda.amazonaws.com');
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

    let code
    if (path.startsWith('s3://')) {
      const [bucketName, key] = path.replace('s3://', '').split('/')
      console.log('bucketName, key', bucketName, key);
      // @ts-ignore
      const bucket = Bucket.fromBucketName(this, name + 'layer', bucketName)

      code = Lambda.Code.fromBucket(bucket, key)
    } else {
      code = Lambda.Code.fromAsset(path)
    }


    // @ts-ignore
    const layer = new Lambda.LayerVersion(this, name, {
      removalPolicy: RemovalPolicy.DESTROY,
      code, // './layers/dax'
    });
    FunctionConstruct.layers[name] = layer;
    this.useLayer(name);
    return layer;
  }

  useLayer(name: string) {
    const layer = FunctionConstruct.layers[name];
    if (!layer) return warn(`layer ${name} not found!`);
    this.layersToUse.push(layer);
    return this
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

  private getDestinationFromConstruct(construct: Construct): IDestination | undefined {

    const fn = construct as unknown as Function
    const queue = construct as unknown as Queue

    console.log(Object.keys(construct))

    if (!!fn.functionArn) {
      console.log('Es Lambda')
      return new LambdaDestination(fn)
    }
    if (!!queue.queueArn) {
      console.log('es SQS', queue.queueName)
      return new SqsDestination(queue)
    }


  }

  then(construct: Construct) {
    this.onSuccess = this.getDestinationFromConstruct(construct)
    return this
  }

  catch(construct: Construct) {
    this.onFailure = this.getDestinationFromConstruct(construct)
    return this
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

        // @ts-ignore
        EC2.Vpc.fromLookup(this, 'default-vpc-' + name, { isDefault: true }) :
        options.vpc as EC2.Vpc;
      // @ts-ignore
      sgs = [EC2.SecurityGroup.fromLookupByName(this, 'defaultSG-' + name, 'default', vpc)];
      //  sgs = Array.isArray(options.securityGroupIds) ? options.securityGroupIds
      //     .map(sgId => EC2.SecurityGroup.fromSecurityGroupId(this, 'sgid', sgId)) : []
      // console.log('sgids', options.securityGroupIds)
      // console.log(sgs)
    }


    const params = {
      // [ ] Allow for other runtimes
      runtime: options.runtime || Lambda.Runtime.NODEJS_LATEST,
      code: getCode(this, functionCode),
      timeout: options.timeout || Duration.seconds(30),
      layers: this.layersToUse,
      memorySize: options.memorySize,
      // code: Lambda.Code.fromAsset(lambdaDef.path),
      allowPublicSubnet: vpc ? true : undefined,
      // architecture: Architecture.ARM_64,
      securityGroups: sgs,
      handler: 'index.handler',
      vpc,
      environment: { ...options.env },
    }


    if (this.onSuccess) params['onSuccess'] = this.onSuccess
    if (this.onFailure) params['onFailure'] = this.onFailure


    const lambdaParams = params as Lambda.FunctionProps;

    // onFailure: '',
    // onSuccess: this.

    // @ts-ignore
    this.handlerFn = new Lambda.Function(this, name + '-handler', lambdaParams);


    // granting access to external resources
    if (Array.isArray(options.access)) {
      // options.access.forEach(accessFn => accessFn(this.handlerFn))
      // @ts-ignore
      options.access.forEach(accessFn => accessFn(this))
    }

    // creating and adding layers
    if (options.layers) {
      options.layers.forEach(layer => this.createLayer(layer.name, layer.path))
    }


    if (!this.handlerFn) throw new Error('something went wrong, this.handlerFn should not be empty');

    // if (options && Array.isArray(options.access)) {
    //     options.access.forEach(fn => fn(lambda));
    // }

    return this.handlerFn;
  }

  /**
   * this tell wich will be the trigger or source of the event for lambda to handle
   *
   * @template T
   * @param {Construct} construct
   * @memberof FunctionConstruct
   */
  trigger(construct: Construct, options?: { batchSize: number, maxConcurrency: number }) {
    console.log(construct.constructor.name);
    if (!this.handlerFn) return console.error('handler function not defined');

    // if Dynamo
    const table = construct as unknown as Dynamo.Table;
    const queue = construct as unknown as Queue;


    if (table.tableArn) {
      this.handlerFn?.addEventSource(new LambdaEventSources.DynamoEventSource(table, {
        startingPosition: Lambda.StartingPosition.TRIM_HORIZON,
      }));
      table.grantStreamRead(this.handlerFn);
    }

    if (queue.queueArn) {
      this.handlerFn?.addEventSource(new LambdaEventSources.SqsEventSource(queue, {
        batchSize: options?.batchSize,
        maxConcurrency: options?.maxConcurrency
      }))
    }

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

    // @ts-ignore
    const invokeLambdaRole = new IAM.Role(this, name, {
      assumedBy: new IAM.ServicePrincipal(servicePrincipal),
      inlinePolicies: {
        InvokeLambda: involeLambdaPolicy,
      },
    })
    return { invokeLambdaRole, involeLambdaPolicy }
  }

}


function getCode(scope, source: string) {
  if (source.includes('s3://')) {

    const s3Url = new URL(source);
    const bucketName = s3Url.hostname;
    const key = s3Url.pathname.substring(1); // Remove leading '/'

    if (!bucketName || !key) {
      throw new Error('Invalid S3 URL format. Expected: s3://bucket-name/key');
    }
    console.log('bucketName', bucketName)
    const bucket = Bucket.fromBucketName(scope, 'sourceCodeBucket' + Date.now() % 1000, bucketName)

    return Lambda.Code.fromBucket(bucket, key)
  }

  if (source.includes('./')) return Lambda.Code.fromAsset(source);


  const code = source.includes('exports.handler = ') ? source : `exports.handler = ${source}`;

  return Lambda.Code.fromInline(code);
}

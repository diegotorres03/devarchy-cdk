import { execSync } from 'child_process';
import { log } from 'console';
import {
  aws_s3 as S3,
  aws_s3_deployment as S3Deployment,
  aws_cloudfront as CloudFront,
  aws_cloudfront_origins as CloudFrontOrigins,
  aws_route53 as Route53,
  aws_route53_targets as Route53Targets,
  aws_certificatemanager as ACM,
  CfnOutput,
  RemovalPolicy,
  Duration,
} from 'aws-cdk-lib'

import { Construct } from 'constructs'


import { FunctionConstruct } from '../compute';
import { ARecord } from 'aws-cdk-lib/aws-route53';
import { HttpOrigin, OriginGroup, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

const { ORIGIN_REQUEST, ORIGIN_RESPONSE, VIEWER_REQUEST, VIEWER_RESPONSE } = CloudFront.LambdaEdgeEventType;

// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-static-web-server
export class WebAppConstruct extends Construct {

  static readonly EVENT_TYPES = CloudFront.LambdaEdgeEventType;

  // private additionalBehaviors: CloudFront.BehaviorOptions[] = []
  cdnDistribution: CloudFront.Distribution;
  private defaultOrigin: CloudFrontOrigins.S3BucketOrigin;
  private pathPattern: string = '';

  webappBucket: S3.Bucket;
  static deployCount = 0
  constructor(scope: Construct, id: string, props?: { domainName?: string, hostedZoneId?: string, certArn?: string }) {
    super(scope, id);

    // [ ] 1.1.1: create S3 Bucket as web hosting to store webapp [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-s3-readme.html)
    this.webappBucket = new S3.Bucket(this, 'webapp-artifact', {
      accessControl: S3.BucketAccessControl.PRIVATE,
      cors: [{
        allowedMethods: [S3.HttpMethods.GET],
        allowedOrigins: ['*'],

        // the properties below are optional
        allowedHeaders: ['Authorization'],
        exposedHeaders: [],
      }],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, 'webappBucketName', {
      value: this.webappBucket.bucketName,
    });
    // exportName: 'webappBucketName'

    // [x] 1.3.1: create Route 53 record set [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-route53-readme.html)
    const domainName = props?.domainName || `no-domain.dev-archy.com`

    // const hostedZone = Route53.HostedZone.fromHostedZoneId(this, 'hostedZone', props?.hostedZoneId || '')

    // const hostedZone = props?.hostedZoneId ? Route53.HostedZone.fromHostedZoneId(this, 'hostedZone', props.hostedZoneId) : new Route53.HostedZone(this, 'hoztedZone', {
    //   zoneName: domainName
    // })  //null

    // const hostedZone = new Route53.HostedZone(this, 'hoztedZone', {
    //   zoneName: domainName,
    // })  

    // importing existing cert
    const cert = props?.certArn && ACM.Certificate.fromCertificateArn(this, domainName + '_cert', props?.certArn)



    // [x] 1.2.1: create CloudFront distribution [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-cloudfront-readme.html)
    // const originAccessIdentity = new CloudFront.OriginAccessIdentity(this, 'OriginAccessIdentity');


    // allow clowdfront to read s3 webpp files
    // this.webappBucket.grantRead(originAccessIdentity);

    // this.defaultOrigin = new CloudFrontOrigins.S3Origin(this.webappBucket, { originAccessIdentity });


    const distributionParams = {
      defaultRootObject: 'index.html',
      priceClass: CloudFront.PriceClass.PRICE_CLASS_100,

      defaultBehavior: {
        // origin: this.defaultOrigin,
        origin: new OriginGroup({
          primaryOrigin: S3BucketOrigin.withOriginAccessControl(this.webappBucket),
          fallbackOrigin: new HttpOrigin('mega-cloud.io'),
          fallbackStatusCodes: [404],
        }),
        viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

      },

    }
    if (cert && domainName) {
      distributionParams['certificate'] = cert,
        distributionParams['domainNames'] = [domainName]
    }

    this.cdnDistribution = new CloudFront.Distribution(this, 'WebappDistribution', distributionParams);

    // this add the "A" record on the route 53 hosted zone, this is what connect route 53 to cloudfront

    let hostedZoneId = props?.hostedZoneId
    if (!hostedZoneId) {
      const hostedZone = new Route53.HostedZone(this, 'hoztedZone_' + domainName, {
        zoneName: domainName,
      })
      hostedZoneId = hostedZone.hostedZoneId
    }

    new ARecord(this, 'domainNameRecord', {
      zone: Route53.HostedZone.fromHostedZoneAttributes(this, 'hostedZone', {
        hostedZoneId: hostedZoneId,
        zoneName: domainName,
      }),
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(this.cdnDistribution)),
    })

    // const recordSet = new Route53.RecordSet(this, domainName + '_recordSet', {
    //   zone: hostedZone,
    //   recordType: Route53.RecordType.A,
    //   target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(this.cdnDistribution)),
    //   recordName: domainName,
    //   comment: 'CDN for ' + domainName,
    // })





    new CfnOutput(this, 'webappDnsUrl', {
      value: this.cdnDistribution.distributionDomainName,
    });
    // exportName: 'webappDnsUrl'

    new CfnOutput(this, 'distributionId', {
      value: this.cdnDistribution.distributionId,
    });
    // exportName: 'distributionId'


    // const webapp = this
    // const handler = (ev => console.log(ev)).toString()

    // const { ORIGIN_REQUEST, ORIGIN_RESPONSE, VIEWER_REQUEST, VIEWER_RESPONSE } = WebAppConstruct.EVENT_TYPES

    // webapp.path('users/*')
    //   .on(VIEWER_REQUEST, handler)
    //   .onOriginRequest(handler)
    //   .onOriginResponse(handler)
    //   .onViewerRequest(handler)
    //   .onViewerResponse(handler)

    // webapp.path('auth/*')
    //   .onOriginRequest(handler)
    //   .onOriginResponse(handler)
    //   .onViewerRequest(handler)
    //   .onViewerResponse(handler)


  }



  /**
     * Use this metod to upload application artifacts
     * add local assets to the remote store (S3 Bucket)
     * be mindfull of size, use this method for small bundles.
     *
     * if you want to send large files, consider using multipart uploads
     * after deploying infraestructure
     *
     * @param {string} path
     * @param {string} [destinationPath]
     * @return {*}
     * @memberof WebAppConstruct
     */
  addAssets(path: string, destinationPath?: string): WebAppConstruct {
    WebAppConstruct.deployCount++
    new S3Deployment.BucketDeployment(this, encodeURIComponent(path) + '-' + WebAppConstruct.deployCount, {
      sources: [S3Deployment.Source.asset(path)],
      destinationBucket: this.webappBucket,
      destinationKeyPrefix: destinationPath ? destinationPath : undefined,
    });
    return this;
  }


  /**
     * Run local comands before uploading assets and creating infraestructure
     *
     *
     * @param {string} path
     * @param {(string | string[])} commands
     * @memberof WebAppConstruct
     */
  run(path: string, commands: string | string[]): WebAppConstruct {
    const cmds = Array.isArray(commands) ? commands : [commands];
    for (let cmd of cmds) {
      const res = execSync(cmd, {
        cwd: path,
        stdio: [0, 1, 2],
      });
      log(res);
    }
    return this;
  }

  // domainName(domainName: string): WebAppConstruct {

  //   return this
  // }


  path(pathPattern: string) {
    this.pathPattern = pathPattern;
    return this;
  }

  // readFrom(construct: Construct): WebAppConstruct {
  //   // if (!this.currentHandler) throw new Error('you need to create a handler function first');
  //   // // if Dynamo
  //   // const table = construct as Dynamo.Table;
  //   // table.grantReadData(this.currentHandler);
  //   return this
  // }

  on(eventType: CloudFront.LambdaEdgeEventType, handlerCode: string | string[]): WebAppConstruct {
    const handlers = Array.isArray(handlerCode) ? handlerCode : [handlerCode];
    const path = this.pathPattern;

    // [ ] add permisions to those lambdas
    handlers.map(code => {
      const fn = new FunctionConstruct(this, `${path}/${eventType}`);
      fn.code(code);
      return fn;
    });

    return this;
  }

  onViewerRequest(handlerCode: string) {
    const path = this.pathPattern;
    const eventType = VIEWER_REQUEST;
    const fn = new FunctionConstruct(this, `${path}/${eventType}`);
    fn.code(handlerCode, { timeout: Duration.seconds(3) });

    if (!fn.handlerFn) throw new Error('handler fn not created');


    // [ ] optimize to reuse this piece of code in the rest
    this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
      edgeLambdas: [{
        eventType,
        functionVersion: fn.handlerFn?.currentVersion,
        includeBody: true,
      }],
    });
    return this;
  }

  // [ ] instead of creating the behaviour on each call, can I group them?
  onViewerResponse(handlerCode: string) {
    const path = this.pathPattern;

    const eventType = VIEWER_RESPONSE;
    const fnId = `${path}/${eventType}`;
    console.log(fnId);
    const fn = new FunctionConstruct(this, fnId);
    fn.code(handlerCode, { timeout: Duration.seconds(3) });

    if (!fn.handlerFn) throw new Error('handler fn not created');


    // [ ] optimize to reuse this piece of code in the rest
    this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
      edgeLambdas: [{
        eventType,
        functionVersion: fn.handlerFn?.currentVersion,
        // includeBody: true, // not valid on response
      }],
    });
    return this;
  }


  onOriginRequest(handlerCode: string) {
    const path = this.pathPattern;

    const eventType = ORIGIN_REQUEST;
    const fn = new FunctionConstruct(this, `${path}/${eventType}`);
    fn.code(handlerCode, { timeout: Duration.seconds(3) });

    if (!fn.handlerFn) throw new Error('handler fn not created');


    // [ ] optimize to reuse this piece of code in the rest
    this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
      edgeLambdas: [{
        eventType,
        functionVersion: fn.handlerFn?.currentVersion,
        includeBody: true,
      }],
    });
    return this;
  }

  onOriginResponse(handlerCode: string) {
    const path = this.pathPattern;

    const eventType = ORIGIN_RESPONSE;
    const fn = new FunctionConstruct(this, `${path}/${eventType}`);
    fn.code(handlerCode, { timeout: Duration.seconds(3) });

    if (!fn.handlerFn) throw new Error('handler fn not created');


    // [ ] optimize to reuse this piece of code in the rest
    this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
      edgeLambdas: [{
        eventType,
        functionVersion: fn.handlerFn?.currentVersion,
        // includeBody: true, // not valid on response
      }],
    });
    return this;
  }

}

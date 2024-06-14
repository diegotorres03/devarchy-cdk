"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAppConstruct = void 0;
const child_process_1 = require("child_process");
const console_1 = require("console");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const compute_1 = require("../compute");
const { ORIGIN_REQUEST, ORIGIN_RESPONSE, VIEWER_REQUEST, VIEWER_RESPONSE } = aws_cdk_lib_1.aws_cloudfront.LambdaEdgeEventType;
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-static-web-server
class WebAppConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.pathPattern = '';
        // [ ] 1.1.1: create S3 Bucket as web hosting to store webapp [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-s3-readme.html)
        this.webappBucket = new aws_cdk_lib_1.aws_s3.Bucket(this, 'webapp-artifact', {
            accessControl: aws_cdk_lib_1.aws_s3.BucketAccessControl.PRIVATE,
            cors: [{
                    allowedMethods: [aws_cdk_lib_1.aws_s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    // the properties below are optional
                    allowedHeaders: ['Authorization'],
                    exposedHeaders: [],
                }],
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'webappBucketName', {
            value: this.webappBucket.bucketName,
        });
        // exportName: 'webappBucketName'
        // [ ] 1.3.1: create Route 53 record set [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-route53-readme.html)
        const domainName = (props === null || props === void 0 ? void 0 : props.domainName) || `${Date.now()}.diegotrs.com`;
        const hostedZone = new aws_cdk_lib_1.aws_route53.HostedZone(this, 'hoztedZone', {
            zoneName: domainName
        });
        // importing existing cert
        const cert = (props === null || props === void 0 ? void 0 : props.certArn) && aws_cdk_lib_1.aws_certificatemanager.Certificate.fromCertificateArn(this, domainName + '_cert', props === null || props === void 0 ? void 0 : props.certArn);
        // [ ] 1.2.1: create CloudFront distribution [docs](https://docs.aws.amazon.com/cdk/api/v1/docs/aws-cloudfront-readme.html)
        const originAccessIdentity = new aws_cdk_lib_1.aws_cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity');
        // allow clowdfront to read s3 webpp files
        this.webappBucket.grantRead(originAccessIdentity);
        this.defaultOrigin = new aws_cdk_lib_1.aws_cloudfront_origins.S3Origin(this.webappBucket, { originAccessIdentity });
        const distributionParams = {
            defaultRootObject: 'index.html',
            priceClass: aws_cdk_lib_1.aws_cloudfront.PriceClass.PRICE_CLASS_100,
            defaultBehavior: {
                origin: this.defaultOrigin,
                viewerProtocolPolicy: aws_cdk_lib_1.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
        };
        if (cert && domainName) {
            distributionParams['certificate'] = cert,
                distributionParams['domainNames'] = [domainName];
        }
        this.cdnDistribution = new aws_cdk_lib_1.aws_cloudfront.Distribution(this, 'WebappDistribution', distributionParams);
        const recordSet = new aws_cdk_lib_1.aws_route53.RecordSet(this, domainName + '_recordSet', {
            zone: hostedZone,
            recordType: aws_cdk_lib_1.aws_route53.RecordType.A,
            target: aws_cdk_lib_1.aws_route53.RecordTarget.fromAlias(new aws_cdk_lib_1.aws_route53_targets.CloudFrontTarget(this.cdnDistribution)),
            recordName: domainName,
            comment: 'CDN for ' + domainName,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'webappDnsUrl', {
            value: this.cdnDistribution.distributionDomainName,
        });
        // exportName: 'webappDnsUrl'
        new aws_cdk_lib_1.CfnOutput(this, 'distributionId', {
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
    addAssets(path, destinationPath) {
        new aws_cdk_lib_1.aws_s3_deployment.BucketDeployment(this, 'deployStaticWebapp', {
            sources: [aws_cdk_lib_1.aws_s3_deployment.Source.asset(path)],
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
    run(path, commands) {
        const cmds = Array.isArray(commands) ? commands : [commands];
        for (let cmd of cmds) {
            const res = (0, child_process_1.execSync)(cmd, {
                cwd: path,
                stdio: [0, 1, 2],
            });
            (0, console_1.log)(res);
        }
        return this;
    }
    domainName(domainName) {
        return this;
    }
    path(pathPattern) {
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
    on(eventType, handlerCode) {
        const handlers = Array.isArray(handlerCode) ? handlerCode : [handlerCode];
        const path = this.pathPattern;
        // [ ] add permisions to those lambdas
        handlers.map(code => {
            const fn = new compute_1.FunctionConstruct(this, `${path}/${eventType}`);
            fn.code(code);
            return fn;
        });
        return this;
    }
    onViewerRequest(handlerCode) {
        var _a;
        const path = this.pathPattern;
        const eventType = VIEWER_REQUEST;
        const fn = new compute_1.FunctionConstruct(this, `${path}/${eventType}`);
        fn.code(handlerCode, { timeout: aws_cdk_lib_1.Duration.seconds(3) });
        if (!fn.handlerFn)
            throw new Error('handler fn not created');
        // [ ] optimize to reuse this piece of code in the rest
        this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
            edgeLambdas: [{
                    eventType,
                    functionVersion: (_a = fn.handlerFn) === null || _a === void 0 ? void 0 : _a.currentVersion,
                    includeBody: true,
                }],
        });
        return this;
    }
    // [ ] instead of creating the behaviour on each call, can I group them?
    onViewerResponse(handlerCode) {
        var _a;
        const path = this.pathPattern;
        const eventType = VIEWER_RESPONSE;
        const fnId = `${path}/${eventType}`;
        console.log(fnId);
        const fn = new compute_1.FunctionConstruct(this, fnId);
        fn.code(handlerCode, { timeout: aws_cdk_lib_1.Duration.seconds(3) });
        if (!fn.handlerFn)
            throw new Error('handler fn not created');
        // [ ] optimize to reuse this piece of code in the rest
        this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
            edgeLambdas: [{
                    eventType,
                    functionVersion: (_a = fn.handlerFn) === null || _a === void 0 ? void 0 : _a.currentVersion,
                    // includeBody: true, // not valid on response
                }],
        });
        return this;
    }
    onOriginRequest(handlerCode) {
        var _a;
        const path = this.pathPattern;
        const eventType = ORIGIN_REQUEST;
        const fn = new compute_1.FunctionConstruct(this, `${path}/${eventType}`);
        fn.code(handlerCode, { timeout: aws_cdk_lib_1.Duration.seconds(3) });
        if (!fn.handlerFn)
            throw new Error('handler fn not created');
        // [ ] optimize to reuse this piece of code in the rest
        this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
            edgeLambdas: [{
                    eventType,
                    functionVersion: (_a = fn.handlerFn) === null || _a === void 0 ? void 0 : _a.currentVersion,
                    includeBody: true,
                }],
        });
        return this;
    }
    onOriginResponse(handlerCode) {
        var _a;
        const path = this.pathPattern;
        const eventType = ORIGIN_RESPONSE;
        const fn = new compute_1.FunctionConstruct(this, `${path}/${eventType}`);
        fn.code(handlerCode, { timeout: aws_cdk_lib_1.Duration.seconds(3) });
        if (!fn.handlerFn)
            throw new Error('handler fn not created');
        // [ ] optimize to reuse this piece of code in the rest
        this.cdnDistribution.addBehavior(path, this.defaultOrigin, {
            edgeLambdas: [{
                    eventType,
                    functionVersion: (_a = fn.handlerFn) === null || _a === void 0 ? void 0 : _a.currentVersion,
                    // includeBody: true, // not valid on response
                }],
        });
        return this;
    }
}
exports.WebAppConstruct = WebAppConstruct;
WebAppConstruct.EVENT_TYPES = aws_cdk_lib_1.aws_cloudfront.LambdaEdgeEventType;

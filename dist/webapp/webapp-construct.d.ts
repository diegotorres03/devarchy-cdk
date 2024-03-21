import { aws_s3 as S3, aws_cloudfront as CloudFront } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class WebAppConstruct extends Construct {
    static readonly EVENT_TYPES: typeof CloudFront.LambdaEdgeEventType;
    cdnDistribution: CloudFront.Distribution;
    private defaultOrigin;
    private pathPattern;
    webappBucket: S3.Bucket;
    constructor(scope: Construct, id: string, props?: {
        domainName: string;
    });
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
    addAssets(path: string, destinationPath?: string): WebAppConstruct;
    /**
       * Run local comands before uploading assets and creating infraestructure
       *
       *
       * @param {string} path
       * @param {(string | string[])} commands
       * @memberof WebAppConstruct
       */
    run(path: string, commands: string | string[]): WebAppConstruct;
    domainName(domainName: string): WebAppConstruct;
    path(pathPattern: string): this;
    on(eventType: CloudFront.LambdaEdgeEventType, handlerCode: string | string[]): WebAppConstruct;
    onViewerRequest(handlerCode: string): this;
    onViewerResponse(handlerCode: string): this;
    onOriginRequest(handlerCode: string): this;
    onOriginResponse(handlerCode: string): this;
}

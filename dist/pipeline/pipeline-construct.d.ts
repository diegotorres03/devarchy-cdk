import { aws_s3 as S3, aws_codeartifact as CodeArtifact, aws_codepipeline as CodePipeline, aws_codecommit as CodeCommit } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class PipeConstruct extends Construct {
    static DEPLOY_CDK: {
        version: string;
        phases: {
            install: {
                'runtime-versions': {
                    nodejs: string;
                };
            };
            pre_build: {
                commands: string[];
            };
            build: {
                commands: string[];
            };
            post_build: {
                commands: string[];
            };
        };
    };
    static DEPLOY_NPM: {
        version: string;
        phases: {
            install: {
                'runtime-versions': {
                    nodejs: string;
                };
            };
            pre_build: {
                commands: string[];
            };
            build: {
                commands: string[];
            };
            post_build: {
                commands: string[];
            };
        };
    };
    pipeline: CodePipeline.Pipeline;
    sourceOutput: CodePipeline.Artifact;
    account: string;
    region: string;
    constructor(scope: Construct, id: string, props?: {
        account?: string;
        region?: string;
    });
    /**
     * create a domain
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codeartifact-domain.html
     *
     * @param {string} domainName A string that specifies the name of the requested domain.
     * @memberof PipeConstruct
     */
    createArtifactDomain(domainName: string): CodeArtifact.CfnDomain;
    createArtifactRepository(domainName: string, repositoryName: string): CodeArtifact.CfnRepository;
    getBuildCount(): number;
    createCodeRepository(name: string, path?: string): CodeCommit.Repository;
    /**
     * set a codecommit repository as the source action
     *
     * @param {CodeCommit.Repository} codeRepo
     * @param {string} [branch='main']
     * @return {PipeConstruct}
     * @memberof PipeConstruct
     */
    source(codeRepo: CodeCommit.Repository, branch?: string): this;
    /**
     * Create a build stage on CodeBuild and attach it to code pipeline
     *
     * @link https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
     *
     * @param {*} buildSpecJson - CodeBuild spesification file
     * @param {{
     *         s3Bucket?: S3.Bucket,
     *         path?: string,
     *         qualifier?: string,
     *     }} [options]
     * @return {PipeConstruct}
     * @memberof PipeConstruct
     */
    build(buildSpecJson?: object, options?: {
        s3Bucket?: S3.Bucket;
        path?: string;
        qualifier?: string;
    }): this;
    deploy(target: any): this;
    /**
     * this is one possible strategy
     *
     * @param {number} [retyCount=2]
     * @return {*}
     * @memberof PipeConstruct
     */
    retry(retyCount?: number): this;
    /**
     * use it to make an step optional
     * @since 11/19/2022
     * @param {Function} [handler]
     * @return {*}
     * @memberof PipeConstruct
     */
    skip(handler?: Function): this;
    catch(handler: Function): this;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipeConstruct = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const { log, warn, error } = console;
let buildCount = 0;
const buildSpecForCDK = {
    version: '0.2',
    phases: {
        install: {
            'runtime-versions': {
                nodejs: "latest"
            },
        },
        pre_build: {
            commands: [
                'node --version',
                'npm --version',
                'npm i -g aws-cdk',
                'npm i',
            ]
        },
        build: {
            commands: [
                'echo "building stuff!!"',
                // 'npm run deploy',
                //   'cdk deploy DtAwsInfraStack --require-approval never',
                'cdk deploy --all --require-approval never',
            ]
        },
        post_build: {
            commands: [
                'echo "post build!!"',
                'echo "ESO CARAJO 17"',
            ]
        },
    }
};
const npmRunBuildspec = {
    version: '0.2',
    phases: {
        install: {
            'runtime-versions': {
                nodejs: "latest"
            },
        },
        pre_build: {
            commands: [
                'node --version',
                'npm --version',
                'npm i -g aws-cdk',
                'npm i',
            ]
        },
        build: {
            commands: [
                'npm run build',
                // 'cdk deploy --all --require-approval never',
            ]
        },
        post_build: {
            commands: [
                'npm run deploy',
            ]
        },
    }
};
class PipeConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // CodePipeline.Artifact 
        this.sourceOutput = new aws_cdk_lib_1.aws_codepipeline.Artifact();
        this.account = (props === null || props === void 0 ? void 0 : props.account) || aws_cdk_lib_1.Stack.of(this).account || process.env.CDK_DEFAULT_ACCOUNT || 'no-account';
        this.region = (props === null || props === void 0 ? void 0 : props.region) || aws_cdk_lib_1.Stack.of(this).region || process.env.CDK_DEFAULT_REGION || 'no-region';
        console.table({ account: this.account, region: this.region });
        this.pipeline = new aws_cdk_lib_1.aws_codepipeline.Pipeline(this, 'pipeline', {
            crossAccountKeys: false,
        });
    }
    /**
     * create a domain
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codeartifact-domain.html
     *
     * @param {string} domainName A string that specifies the name of the requested domain.
     * @memberof PipeConstruct
     */
    createArtifactDomain(domainName) {
        const domain = new aws_cdk_lib_1.aws_codeartifact.CfnDomain(this, 'artifact-domain', {
            domainName,
        });
        return domain;
    }
    createArtifactRepository(domainName, repositoryName) {
        const artifactRepo = new aws_cdk_lib_1.aws_codeartifact.CfnRepository(this, 'artifact-repo', {
            domainName,
            repositoryName,
            // upstreams: [''],
        });
        return artifactRepo;
    }
    getBuildCount() {
        return buildCount++;
    }
    createCodeRepository(name, path) {
        // [ ] create repo
        const codeRepo = new aws_cdk_lib_1.aws_codecommit.Repository(this, name, {
            repositoryName: name,
            description: 'public web component repository, usefull for quick PoCs',
            code: path ? aws_cdk_lib_1.aws_codecommit.Code.fromDirectory(path) : undefined,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'codeRepoSSH', { value: codeRepo.repositoryCloneUrlSsh, });
        new aws_cdk_lib_1.CfnOutput(this, 'codeRepoHTTPS', { value: codeRepo.repositoryCloneUrlHttp, });
        return codeRepo;
    }
    /**
     * set a codecommit repository as the source action
     *
     * @param {CodeCommit.Repository} codeRepo
     * @param {string} [branch='main']
     * @return {PipeConstruct}
     * @memberof PipeConstruct
     */
    source(codeRepo, branch = 'main') {
        const sourceAction = new aws_cdk_lib_1.aws_codepipeline_actions.CodeCommitSourceAction({
            actionName: 'CodeCommit',
            repository: codeRepo,
            output: this.sourceOutput,
            branch,
        });
        const sourceStage = this.pipeline.addStage({ stageName: 'Source' });
        sourceStage.addAction(sourceAction);
        return this;
    }
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
    build(buildSpecJson = PipeConstruct.DEPLOY_NPM, options) {
        var _a, _b, _c;
        // https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
        const count = this.getBuildCount();
        const buildProjectParams = {
            buildSpec: aws_cdk_lib_1.aws_codebuild.BuildSpec.fromObject(buildSpecJson),
            artifacts: options && options.s3Bucket ? aws_cdk_lib_1.aws_codebuild.Artifacts.s3({
                bucket: options.s3Bucket,
                // packageZip: false,
                // path: options.path || undefined,
            }) : undefined,
            environment: {
                computeType: aws_cdk_lib_1.aws_codebuild.ComputeType.MEDIUM,
                buildImage: aws_cdk_lib_1.aws_codebuild.LinuxBuildImage.STANDARD_7_0,
            },
        };
        // if (options && options.s3Bucket) {
        //     buildProjectParams.artifacts = CodeBuild.Artifacts.s3({
        //         bucket: options.s3Bucket,
        //         // packageZip: false,
        //         // path: options.path || undefined,
        //     })
        // }
        const buildProject = new aws_cdk_lib_1.aws_codebuild.Project(this, 'Build-project-' + count, buildProjectParams);
        const buildStage = this.pipeline.addStage({ stageName: 'Build-' + count });
        buildStage.addAction(new aws_cdk_lib_1.aws_codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: this.sourceOutput,
            outputs: [new aws_cdk_lib_1.aws_codepipeline.Artifact()],
        }));
        const Qualifier = (options === null || options === void 0 ? void 0 : options.qualifier) || 'hnb659fds';
        const accountId = aws_cdk_lib_1.Stack.of(this).account || process.env.CDK_DEFAULT_ACCOUNT;
        const region = aws_cdk_lib_1.Stack.of(this).region || process.env.CDK_DEFAULT_REGION || 'us-east-2';
        // HOTFIX: The role is from the CDK bootstrap and is found on the CdkToolKit stack
        // TODO: make this automatic and not tie to the arn
        (_a = buildProject.role) === null || _a === void 0 ? void 0 : _a.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [
                `arn:aws:iam::${accountId}:role/cdk-${Qualifier}-deploy-role-${accountId}-${region}`
            ],
            // resources: ['arn:aws:iam::177624785149:role/cdk-hnb659fds-deploy-role-177624785149-us-east-2'],
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
        }));
        (_b = buildProject.role) === null || _b === void 0 ? void 0 : _b.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [`arn:aws:iam::${accountId}:role/cdk-${Qualifier}-file-publishing-role-${accountId}-${region}`],
            // resources: ['arn:aws:iam::177624785149:role/cdk-hnb659fds-file-publishing-role-177624785149-us-east-2'],
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
        }));
        // giving access to the CDKToolKit ssm parameter, for cdk version
        (_c = buildProject.role) === null || _c === void 0 ? void 0 : _c.addToPrincipalPolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [`arn:aws:ssm:${region}:${accountId}:parameter/cdk-bootstrap/${Qualifier}/version`],
            // resources: ['arn:aws:ssm:us-east-2:177624785149:parameter/cdk-bootstrap/hnb659fds/version'],
            effect: aws_cdk_lib_1.aws_iam.Effect.ALLOW,
        }));
        return this;
    }
    deploy(target) {
        return this;
    }
    /**
     * this is one possible strategy
     *
     * @param {number} [retyCount=2]
     * @return {*}
     * @memberof PipeConstruct
     */
    retry(retyCount = 2) {
        return this;
    }
    /**
     * use it to make an step optional
     * @since 11/19/2022
     * @param {Function} [handler]
     * @return {*}
     * @memberof PipeConstruct
     */
    skip(handler) {
        return this;
    }
    catch(handler) {
        // here do whatever you can imaging 
        // feel free to push the boundaries and shar it back witn the community
        return this;
    }
}
exports.PipeConstruct = PipeConstruct;
PipeConstruct.DEPLOY_CDK = buildSpecForCDK;
PipeConstruct.DEPLOY_NPM = npmRunBuildspec;

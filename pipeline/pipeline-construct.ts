import {
    Stack,
    StackProps,
    aws_s3 as S3,
    aws_iam as IAM,
    aws_codeartifact as CodeArtifact,
    aws_codepipeline as CodePipeline,
    aws_codecommit as CodeCommit,
    aws_codepipeline_actions as CodePipelineActions,
    aws_codebuild as CodeBuild,
    CfnOutput,
    RemovalPolicy,
    Duration,
} from 'aws-cdk-lib'
import { CodeBuildProjectProps } from 'aws-cdk-lib/aws-events-targets'
import { Construct } from 'constructs'

const { log, warn, error } = console

let buildCount = 0

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
}

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
}

export class PipeConstruct extends Construct {

    static DEPLOY_CDK = buildSpecForCDK
    static DEPLOY_NPM = npmRunBuildspec
    

    pipeline: CodePipeline.Pipeline
    sourceOutput: CodePipeline.Artifact
    account: string
    region: string

    constructor(scope: Construct, id: string, props?: { account?: string, region?: string }) {
        super(scope, id)

        // CodePipeline.Artifact 
        this.sourceOutput = new CodePipeline.Artifact()


        this.account = props?.account || Stack.of(this).account || process.env.CDK_DEFAULT_ACCOUNT || 'no-account'
        this.region = props?.region || Stack.of(this).region || process.env.CDK_DEFAULT_REGION || 'no-region'

        console.table({ account: this.account, region: this.region })

        this.pipeline = new CodePipeline.Pipeline(this, 'pipeline', {
            crossAccountKeys: false,
        })

    }

    /**
     * create a domain
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codeartifact-domain.html
     *
     * @param {string} domainName A string that specifies the name of the requested domain. 
     * @memberof PipeConstruct
     */
    createArtifactDomain(domainName: string) {
        const domain = new CodeArtifact.CfnDomain(this, 'artifact-domain', {
            domainName,
        })
        return domain
    }

    createArtifactRepository(domainName: string, repositoryName: string) {
        const artifactRepo = new CodeArtifact.CfnRepository(this, 'artifact-repo', {
            domainName,
            repositoryName,
            // upstreams: [''],
        })
        return artifactRepo
    }

    getBuildCount() {
        return buildCount++
    }


    createCodeRepository(name: string, path?: string) {
        // [ ] create repo
        const codeRepo = new CodeCommit.Repository(this, name, {
            repositoryName: name,
            description: 'public web component repository, usefull for quick PoCs',
            code: path ? CodeCommit.Code.fromDirectory(path) : undefined,
        })

        new CfnOutput(this, 'codeRepoSSH', { value: codeRepo.repositoryCloneUrlSsh, })
        new CfnOutput(this, 'codeRepoHTTPS', { value: codeRepo.repositoryCloneUrlHttp, })
        return codeRepo
    }


    /**
     * set a codecommit repository as the source action
     *
     * @param {CodeCommit.Repository} codeRepo
     * @param {string} [branch='main']
     * @return {PipeConstruct} 
     * @memberof PipeConstruct
     */
    source(codeRepo: CodeCommit.Repository, branch = 'main') {
        const sourceAction = new CodePipelineActions.CodeCommitSourceAction({
            actionName: 'CodeCommit',
            repository: codeRepo,
            output: this.sourceOutput,
            branch,
        })


        const sourceStage = this.pipeline.addStage({ stageName: 'Source' })
        sourceStage.addAction(sourceAction)

        return this
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
    build(buildSpecJson: object = PipeConstruct.DEPLOY_NPM, options?: {
        s3Bucket?: S3.Bucket,
        path?: string,
        qualifier?: string
    }) {
        // https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
        const count = this.getBuildCount()

        const buildProjectParams: CodeBuild.ProjectProps = {
            buildSpec: CodeBuild.BuildSpec.fromObject(buildSpecJson),
            artifacts: options && options.s3Bucket ? CodeBuild.Artifacts.s3({
                bucket: options.s3Bucket,
                // packageZip: false,
                // path: options.path || undefined,
            }) : undefined,
            environment: {
                computeType: CodeBuild.ComputeType.MEDIUM,
                buildImage: CodeBuild.LinuxBuildImage.STANDARD_7_0,
            },

        }

        // if (options && options.s3Bucket) {
        //     buildProjectParams.artifacts = CodeBuild.Artifacts.s3({
        //         bucket: options.s3Bucket,
        //         // packageZip: false,
        //         // path: options.path || undefined,
        //     })
        // }

        const buildProject = new CodeBuild.Project(this, 'Build-project-' + count, buildProjectParams)


        const buildStage = this.pipeline.addStage({ stageName: 'Build-' + count })
        buildStage.addAction(new CodePipelineActions.CodeBuildAction({
            actionName: 'CodeBuild',
            project: buildProject,
            input: this.sourceOutput,
            outputs: [new CodePipeline.Artifact()],
        }))

        const Qualifier = options?.qualifier || 'hnb659fds'
        const accountId = Stack.of(this).account || process.env.CDK_DEFAULT_ACCOUNT
        const region = Stack.of(this).region || process.env.CDK_DEFAULT_REGION || 'us-east-2'

        // HOTFIX: The role is from the CDK bootstrap and is found on the CdkToolKit stack
        // TODO: make this automatic and not tie to the arn
        buildProject.role?.addToPrincipalPolicy(new IAM.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [
                `arn:aws:iam::${accountId}:role/cdk-${Qualifier}-deploy-role-${accountId}-${region}`
            ],
            // resources: ['arn:aws:iam::177624785149:role/cdk-hnb659fds-deploy-role-177624785149-us-east-2'],
            effect: IAM.Effect.ALLOW,
        }))

        buildProject.role?.addToPrincipalPolicy(new IAM.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [`arn:aws:iam::${accountId}:role/cdk-${Qualifier}-file-publishing-role-${accountId}-${region}`],
            // resources: ['arn:aws:iam::177624785149:role/cdk-hnb659fds-file-publishing-role-177624785149-us-east-2'],
            effect: IAM.Effect.ALLOW,
        }))

        // giving access to the CDKToolKit ssm parameter, for cdk version
        buildProject.role?.addToPrincipalPolicy(new IAM.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [`arn:aws:ssm:${region}:${accountId}:parameter/cdk-bootstrap/${Qualifier}/version`],
            // resources: ['arn:aws:ssm:us-east-2:177624785149:parameter/cdk-bootstrap/hnb659fds/version'],
            effect: IAM.Effect.ALLOW,
        }))


        return this
    }

    deploy(target: any) {
        return this
    }


    /**
     * this is one possible strategy
     *
     * @param {number} [retyCount=2]
     * @return {*} 
     * @memberof PipeConstruct
     */
    retry(retyCount: number = 2) {
        return this
    }

    /**
     * use it to make an step optional
     * @since 11/19/2022
     * @param {Function} [handler]
     * @return {*} 
     * @memberof PipeConstruct
     */
    skip(handler?: Function) {
        return this
    }

    catch(handler: Function) {
        // here do whatever you can imaging 
        // feel free to push the boundaries and shar it back witn the community
        return this
    }
}
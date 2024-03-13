import {
  aws_cloud9 as Cloud9,
  aws_codecommit as CodeCommit,

  CfnOutput,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

/**
 * Create a WebIDE (Cloud9 instance)
 * Eventually this construct will create more resources, not just the instance
 *
 * @export
 * @class WebIDEConstruct
 * @extends {Construct}
 */
export class WebIDEConstruct extends Construct {

  name: string

  cloud9Instance: Cloud9.CfnEnvironmentEC2 | undefined
  description: string

  constructor(scope: Construct, id: string, props?: { name: string, description?: string }) {
    super(scope, id)
    this.name = props?.name || 'WebIDE' + Date.now()
    this.description = props?.description || 'WebIDE' + Date.now()

  }

  /**
   *
   *
   * @param {{ instanceType: string, timeout: number}} params - timeout in munutes
   * @memberof WebIDEConstruct
   */
  createDevInstance(params: { instanceType: string, timeout: number }): WebIDEConstruct {

    this.cloud9Instance = new Cloud9.CfnEnvironmentEC2(this, this.name, {
      // name: this.name,
      description: this.description,
      instanceType: params?.instanceType || 't3.small',
      automaticStopTimeMinutes: params?.timeout || 20,
      connectionType: 'CONNECT_SSM',
      // ownerArn: '',
      // subnetId: props.subnetId,
      // repositories: [],
      // imageId: 'ami-025e3193ba5b30807' // amazonlinux-2-x86_64
      imageId: 'ubuntu-22.04-x86_64' // Ubunt //ami-090c0d0d88b15cb9c
      // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloud9-environmentec2.html#cfn-cloud9-environmentec2-imageid
    })


    new CfnOutput(this, 'cloud9-url', {
      value: `https://us-east-2.console.aws.amazon.com/cloud9/ide/${this.cloud9Instance.logicalId}`,
      description: 'Cloud9 IDE URL',
    })

    return this
  }

  /**
   * pass the user/group?/role? arn of the owner of this env
   * An user has to be the owner, be on the group or role with permissions
   * to this environment in order to be able to open it
   *
   * @param {string} [owner]
   * @memberof WebIDEConstruct
   */
  owner(owner?: string): WebIDEConstruct {
    if (!this.cloud9Instance || !owner) return this
    this.cloud9Instance.ownerArn = owner

    return this
  }

  addRepository(repository: CodeCommit.Repository): WebIDEConstruct {
    if (!this.cloud9Instance) return this
    if (!Array.isArray(this.cloud9Instance.repositories)) this.cloud9Instance.repositories = []
    this.cloud9Instance.repositories.push({
      pathComponent: repository.repositoryName,
      repositoryUrl: repository.repositoryCloneUrlHttp,
    })
    return this
  }

}

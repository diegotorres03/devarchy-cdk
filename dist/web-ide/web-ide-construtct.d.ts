import { aws_cloud9 as Cloud9, aws_codecommit as CodeCommit } from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * Create a WebIDE (Cloud9 instance)
 * Eventually this construct will create more resources, not just the instance
 *
 * @export
 * @class WebIDEConstruct
 * @extends {Construct}
 */
export declare class WebIDEConstruct extends Construct {
    name: string;
    cloud9Instance: Cloud9.CfnEnvironmentEC2 | undefined;
    description: string;
    constructor(scope: Construct, id: string, props?: {
        name: string;
        description?: string;
    });
    /**
     *
     *
     * @param {{ instanceType: string, timeout: number}} params - timeout in munutes
     * @memberof WebIDEConstruct
     */
    createDevInstance(params: {
        instanceType: string;
        timeout: number;
    }): WebIDEConstruct;
    /**
     * pass the user/group?/role? arn of the owner of this env
     * An user has to be the owner, be on the group or role with permissions
     * to this environment in order to be able to open it
     *
     * @param {string} [owner]
     * @memberof WebIDEConstruct
     */
    owner(owner?: string): WebIDEConstruct;
    addRepository(repository: CodeCommit.Repository): WebIDEConstruct;
}

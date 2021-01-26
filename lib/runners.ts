import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import {IVpc} from '@aws-cdk/aws-ec2';
import awsLogs = require('@aws-cdk/aws-logs');
import { ISecret } from '@aws-cdk/aws-secretsmanager'
import path = require('path');


export interface IFargateGitHubRunnerProps {
  /**
   * The Github Personal access token used to access to GitHub organisation. must have the following scopes 
   * repo (all) 
   * admin:org
   */
  githubToken: ISecret,

  /**
   * The VPC to run the fargate self hosted runners in. this would typlically be an environment used for CI 
   */
  githubRunnerVpc: IVpc,

  /**
   * The name/owner of the GitHub organisation
   */
  githubOrgName: string,

  /**
   * The baseline number of GitHub runners you wish to run at all times
   */
  baseTaskCount?: number
}

export class FargateGitHubRunner extends cdk.Construct {
  public readonly runnerService: ecs.FargateService;
  public readonly runnerCluster: string;

  constructor(scope: cdk.Construct, id: string, props: IFargateGitHubRunnerProps) {
    super(scope, id)
    
    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.githubRunnerVpc,
      clusterName: `github-self-hosted-runners`
    });

    this.runnerCluster = cluster.clusterName

    // GitHub runner task/container
    const githubrunner = new ecs.FargateTaskDefinition(this, 'githubrunner', {
      family: 'githubrunner',
      memoryLimitMiB: 4096,
      cpu: 2048
    })
    githubrunner.addContainer('githubrunnercontainer', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '/../', 'github-actions-runner')),
      logging: new ecs.AwsLogDriver({streamPrefix: 'github-ContainerLogs', logRetention:awsLogs.RetentionDays.ONE_DAY}),
      environment: {
        ORG_NAME: props.githubOrgName,
        ORG_RUNNER: 'true',
        LABELS: `fargate`
      },
      secrets: {
        ACCESS_TOKEN: ecs.Secret.fromSecretsManager(props.githubToken)
      }
    })
    this.runnerService = new ecs.FargateService(this, 'githubservice', {
      taskDefinition: githubrunner,
      cluster,
      desiredCount: props.baseTaskCount,
      assignPublicIp: false,
      serviceName: 'github-runner-service'
    })

  }
}
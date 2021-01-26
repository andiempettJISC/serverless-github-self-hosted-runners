import * as cdk from '@aws-cdk/core';
import { Code, Runtime, Function } from '@aws-cdk/aws-lambda';
import { HttpApi } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { Vpc } from '@aws-cdk/aws-ec2';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { FargateGitHubRunner } from './runners';
import { PolicyStatement} from '@aws-cdk/aws-iam';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export class CdkGithubActionsSelfHostedStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOrg: string = this.node.tryGetContext('github_owner')
    const githubRepos: Array<string> = this.node.tryGetContext('github_repos')
    const vpcName: string = this.node.tryGetContext('vpc_name')

    // Import an existing VPC
    // const vpcCI = Vpc.fromLookup(this, 'vpc-ci', {
    //   vpcName: vpcName
    // })

    const vpcCI = new Vpc(this, 'vpc-ci')

    const orgSecret = Secret.fromSecretNameV2(this, 'orgSecret', 'github/actions/runnerToken')

    const githubRunners = new FargateGitHubRunner(this, 'githubRunners', {
      githubOrgName: githubOrg,
      githubRunnerVpc: vpcCI,
      githubToken: orgSecret
    })

    // loop through each repository adding lambdas for each
    for (const repo of githubRepos) {
      const scaleRunnerLambda = new Function(this, `${repo}ScaleRunnerLambda`, {
        runtime: Runtime.NODEJS_12_X,
        code: Code.fromAsset('src'),
        handler: 'scaleRunners.handler',
        environment: {
          GITHUB_API_TOKEN: orgSecret.secretName,
          GITHUB_OWNER: githubOrg,
          GITHUB_REPO: repo,
          FARGATE_SELF_HOSTED_RUNNER_SERVICE: githubRunners.runnerService.serviceName,
          FARGATE_SELF_HOSTED_RUNNER_CLUSTER: githubRunners.runnerCluster,
        }
      });

      orgSecret.grantRead(scaleRunnerLambda)

      scaleRunnerLambda.addToRolePolicy(new PolicyStatement({
        actions: [
          "ecs:DescribeServices",
          "ecs:UpdateService",
        ],
        resources: [
          githubRunners.runnerService.serviceArn
        ]
      }));

      const ecsTaskTarget = new LambdaFunction(scaleRunnerLambda);

      new Rule(this, `${repo}ScheduleRule`, {
        schedule: Schedule.cron({ minute: '*' }),
        targets: [ecsTaskTarget],
      });
    }

    // could use a github webhook to scale up
    // const webhookSecret = Secret.fromSecretNameV2(this, 'SecretFromName', 'github/actions/selfHostedRunnerSecret')

    // const webookLambda = new Function(this, 'webookLambda', {
    //   runtime: Runtime.NODEJS_12_X,
    //   code: Code.fromAsset('src'),
    //   handler: 'index.handler',
    //   environment: {
    //     GITHUB_WEBHOOK_SECRET: "github/actions/selfHostedRunnerSecret"
    //   }
    // });

    // webhookSecret.grantRead(webookLambda)

    // webookLambda.addToRolePolicy(new PolicyStatement({
    //   actions: [
    //     "ecs:DescribeServices",
    //     "ecs:UpdateServices",
    //   ],
    //   resources: [
    //     githubRunners.runnerService.serviceArn
    //   ]
    // }));

    // let api = new HttpApi(this, 'Endpoint', {
    //   defaultIntegration: new LambdaProxyIntegration({
    //     handler: webookLambda
    //   })
    // });

    //  new cdk.CfnOutput(this, 'HTTP API Url', {
    //    value: api.url ?? 'Something went wrong with the deploy'
    //  });

  }
}

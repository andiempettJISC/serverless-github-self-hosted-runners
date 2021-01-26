import { Octokit } from '@octokit/rest';
import * as AWS from 'aws-sdk';
/**
 * A lambda that runs on a schedule. check the GitHub API and see if there are any RUNNING or PENDING workflows
 */

export async function handler(event: any, context: any, callback: any) {
  
  const githubApiToken = await getGitHubSecret()
  
  const octokit = new Octokit({
    auth: githubApiToken
  });

  const data = await octokit.actions.listWorkflowRunsForRepo({
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
    per_page: 100
  });

  
  let demand = 1
  for (const eachWorkflow of data.data.workflow_runs) {
    if (eachWorkflow.status !== 'completed') {
      demand += 1
    }
  }

  await updateRunnerCount(demand)


}

async function updateRunnerCount(taskCount: number) {
  const ecsClient = new AWS.ECS();

  const serviceUpdateResponse = await ecsClient.updateService({
    service: process.env.FARGATE_SELF_HOSTED_RUNNER_SERVICE!,
    cluster: process.env.FARGATE_SELF_HOSTED_RUNNER_CLUSTER!,
    desiredCount: taskCount
  }).promise()
}

async function getGitHubSecret() {
  const secretsClient = new AWS.SecretsManager();
  const ghsecretName = process.env.GITHUB_API_TOKEN!;

  const serviceUpdateResponse = await secretsClient.getSecretValue({
    SecretId: ghsecretName
  }).promise()

  return serviceUpdateResponse.SecretString
}
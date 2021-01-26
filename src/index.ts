const crypto = require('crypto');
import * as AWS from 'aws-sdk';

function signRequestBody(key: any, body: string) {
  return `sha1=${crypto.createHmac('sha1', key).update(body, 'utf-8').digest('hex')}`;
}

export async function handler(event: { headers: any; body: any; }, context: any, callback: any) {
  var errMsg; // eslint-disable-line
  const ghsecretName = process.env.GITHUB_WEBHOOK_SECRET!;
  const token = await getGithubSecrets(ghsecretName);
  console.log(token);

  if (token === undefined) {
    errMsg = 'Incorrect secret defined in secrets manager';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  const headers = event.headers;
  const sig = headers['x-hub-signature'];
  const githubEvent = headers['x-github-event'];
  const id = headers['x-github-delivery'];
  const calculatedSig = signRequestBody(token, event.body);

  if (!sig) {
    errMsg = 'No X-Hub-Signature found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!githubEvent) {
    errMsg = 'No X-Github-Event found on request';
    return callback(null, {
      statusCode: 422,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!id) {
    errMsg = 'No X-Github-Delivery found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (sig !== calculatedSig) {
    errMsg = 'X-Hub-Signature incorrect. Github webhook token doesn\'t match';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  /* eslint-disable */
  console.log('---------------------------------');
  console.log(`Github-Event: "${githubEvent}" with action: "${event.body.action}"`);
  console.log('---------------------------------');
  console.log('Payload', event.body);
  /* eslint-enable */

  // update number of runners
  await describeRunnerService()

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      input: event,
    }),
  };

  return callback(null, response);
};


async function getGithubSecrets(secretName: string) {

  // Create a Secrets Manager client
  var client = new AWS.SecretsManager();

  return new Promise((resolve, reject) => {
    client.getSecretValue({ SecretId: secretName }, function (err: any, data: any) {

      // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
      // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
      // We rethrow the exception by default.
      if (err) {
        reject(err);
      }
      else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
          resolve(data.SecretString);
        } else {
          let buff = new Buffer(data.SecretBinary, 'base64');
          resolve(buff.toString('ascii'));
        }
      }
    });
  });
}

async function describeRunnerService() {
  const ecsClient = new AWS.ECS();

  const existingService = await ecsClient.describeServices({
    services: [process.env.FARGATE_SELF_HOSTED_RUNNER_SERVICE!],
    cluster: process.env.FARGATE_SELF_HOSTED_RUNNER_CLUSTER!
  }).promise()

  if (existingService.services) {
    updateRunnerCount(existingService.services[0].desiredCount)
  }
}

async function updateRunnerCount(taskCount: any) {
  const ecsClient = new AWS.ECS();

  const serviceUpdateResponse = await ecsClient.updateService({
    service: process.env.FARGATE_SELF_HOSTED_RUNNER_SERVICE!,
    cluster: process.env.FARGATE_SELF_HOSTED_RUNNER_CLUSTER!,
    desiredCount: taskCount + 1
  }).promise()
}

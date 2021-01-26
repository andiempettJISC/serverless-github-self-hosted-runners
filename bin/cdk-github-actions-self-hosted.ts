#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkGithubActionsSelfHostedStack } from '../lib/cdk-github-actions-self-hosted-stack';

const app = new cdk.App();
new CdkGithubActionsSelfHostedStack(app, 'CdkGithubActionsSelfHostedStack', {
  env: {
    region: '',
    account: ''
  }
});

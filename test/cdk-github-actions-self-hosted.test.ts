import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkGithubActionsSelfHosted from '../lib/cdk-github-actions-self-hosted-stack';

test('Empty Stack', () => {
    const app = new cdk.App({context: {
      github_owner: 'androidwiltron',
      github_repos: ["serverless-github-self-hosted-runners"]
    }});
    // WHEN
    const stack = new CdkGithubActionsSelfHosted.CdkGithubActionsSelfHostedStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OllamaOnAwsStack } from '../lib/ollama-on-aws-stack';

const app = new cdk.App();
new OllamaOnAwsStack(app, 'OllamaOnAwsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
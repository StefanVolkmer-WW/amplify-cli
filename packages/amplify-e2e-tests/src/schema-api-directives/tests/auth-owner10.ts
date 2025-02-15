/* eslint-disable */
import {
  addApi, amplifyPush, updateAuthAddUserGroups, getAwsIOSConfig,
} from 'amplify-e2e-core';
import Amplify from 'aws-amplify';
import {
  signInUser, getConfiguredAppsyncClientCognitoAuth, setupUser, getUserPoolId,
} from '../authHelper';
import {
  updateSchemaInTestProject, testMutations, testQueries, testSubscriptions,
} from '../common';

const GROUPNAME = 'Admin';
const USERNAME = 'user1';
const PASSWORD = 'user1Password';

export async function runTest(projectDir: string, testModule: any) {
  await addApi(projectDir, {
    'Amazon Cognito User Pool': {},
    transformerVersion: 2,
  });

  updateSchemaInTestProject(projectDir, testModule.schema);
  await updateAuthAddUserGroups(projectDir, [GROUPNAME]);
  await amplifyPush(projectDir);

  const awsconfig = getAwsIOSConfig(projectDir);
  const userPoolId = getUserPoolId(projectDir);

  await configureAmplifyForIos(awsconfig);
  await setupUser(userPoolId, USERNAME, PASSWORD, GROUPNAME);

  const user = await signInUser(USERNAME, PASSWORD);
  const appSyncClient = getConfiguredAppsyncClientCognitoAuth(awsconfig.aws_appsync_graphqlEndpoint, awsconfig.aws_appsync_region, user);

  await testMutations(testModule, appSyncClient);
  await testQueries(testModule, appSyncClient);
  await testSubscriptions(testModule, appSyncClient);
}

async function configureAmplifyForIos(awsconfig: any) {
  const { CredentialsProvider, CognitoUserPool, AppSync } = awsconfig;

  awsconfig.aws_cognito_identity_pool_id = CredentialsProvider.CognitoIdentity.Default.PoolId;
  awsconfig.aws_cognito_region = CredentialsProvider.CognitoIdentity.Default.Region;
  awsconfig.aws_user_pools_id = CognitoUserPool.Default.PoolId;
  awsconfig.aws_user_pools_web_client_id = CognitoUserPool.Default.AppClientId;
  awsconfig.aws_appsync_graphqlEndpoint = AppSync.Default.ApiUrl;
  awsconfig.aws_appsync_region = AppSync.Default.Region;
  awsconfig.aws_appsync_authenticationType = AppSync.Default.AuthMode;

  Amplify.configure(awsconfig);
}

// schema

export const schema = `
# The simplest case
type Post @model @auth(rules: [{allow: owner}]) {
  id: ID!
  title: String!
}
##owner1`;

// mutations

export const mutation = `
mutation CreatePost(
    $input: CreatePostInput!
    $condition: ModelPostConditionInput
  ) {
    createPost(input: $input, condition: $condition) {
      id
      title
      createdAt
      updatedAt
      owner
    }
}`;

export const input_mutation = {
  input: {
    id: '1',
    title: 'title1',
  },
};

export const expected_result_mutation = {
  data: {
    createPost: {
      id: '1',
      title: 'title1',
      createdAt: '<check-defined>',
      updatedAt: '<check-defined>',
      owner: USERNAME,
    },
  },
};

// queries

export const query = `
 query GetPost {
    getPost(id: "1") {
      id
      title
      owner
    }
  }`;

export const expected_result_query = {
  data: {
    getPost: {
      id: '1',
      title: 'title1',
      owner: USERNAME,
    },
  },
};
/* eslint-enable */

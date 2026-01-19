// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools with WorkloadIdentityFederation support

import * as tl from 'azure-pipelines-task-lib/task';
import { isRunningOnAgent } from "../../params/auth/isRunningOnAgent";
import { getEnvironmentUrl } from "../../params/auth/getEnvironmentUrl";
import {
  EnvUrlVariableName,
  ApplicationIdVariableName,
  ClientSecretVariableName,
  TenantIdVariableName,
  DataverseConnectionStringVariableName,
  UserNameVariableName,
  PasswordVariableName,
  IdTokenRequestUrlVariableName,
  AdoIdTokenRequestUrlVariableName,
  AdoIdTokenRequestTokenVariableName
} from "../../host/PipelineVariables";

(async () => {
  if (isRunningOnAgent()) {
    await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const authenticationType = tl.getInputRequired('authenticationType');
  const environmentUrl = getEnvironmentUrl();

  tl.setVariable(EnvUrlVariableName, environmentUrl, false);

  switch (authenticationType) {
    case 'PowerPlatformSPN': {
      const powerPlatformSPN = tl.getInputRequired(authenticationType);
      const authorization = tl.getEndpointAuthorization(powerPlatformSPN, false);
      
      if (!authorization) {
        throw new Error(`Could not get credentials for endpoint: ${powerPlatformSPN}`);
      }

      tl.debug(`Auth Scheme: ${authorization.scheme}`);

      // Handle WorkloadIdentityFederation
      if (authorization.scheme === 'WorkloadIdentityFederation') {
        tl.debug('Configuring WorkloadIdentityFederation authentication');
        
        // Get the service principal ID and tenant ID from the service connection
        const servicePrincipalId = authorization.parameters['serviceprincipalid'];
        const tenantId = authorization.parameters['tenantid'];
        
        if (!servicePrincipalId || !tenantId) {
          throw new Error('ServicePrincipalId and TenantId are required for WorkloadIdentityFederation');
        }

        // Set environment variables for Workload Identity Federation
        tl.debug('Acquiring Workload Identity Federation details from pipeline service connection');
        const idTokenRequestUrl = buildIdTokenRequestUrl(powerPlatformSPN);
        process.env.PAC_ADO_ID_TOKEN_REQUEST_URL = idTokenRequestUrl;
        tl.debug(`OIDC Token Request URL: ${idTokenRequestUrl}`);

        // Set the IdTokenRequestUrl as a pipeline variable
        tl.setVariable(IdTokenRequestUrlVariableName, idTokenRequestUrl, false);
        
        // Also expose as BuildTools.AdoIdTokenRequestUrl for consistency with PAC_ADO_ID_TOKEN_REQUEST_URL
        // This allows downstream tasks to reference the same URL using either variable name
        tl.setVariable(AdoIdTokenRequestUrlVariableName, idTokenRequestUrl, false);

        // Get the pipeline OAuth token for requesting OIDC tokens
        const pipelineAuth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
        if (pipelineAuth && pipelineAuth.scheme === 'OAuth') {
            const accessToken = pipelineAuth.parameters['AccessToken'];
            if (accessToken) {
                tl.debug('Pipeline connection found with OAuth scheme');
                process.env.PAC_ADO_ID_TOKEN_REQUEST_TOKEN = accessToken;
                tl.setSecret(accessToken);
                
                // Expose PAC_ADO_ID_TOKEN_REQUEST_TOKEN as an output variable (secret)
                tl.setVariable(AdoIdTokenRequestTokenVariableName, accessToken, true);
            } else {
                tl.warning('Pipeline OAuth token not found. Workload Identity Federation may not work as expected.');
            }
        } else {
            tl.warning('Could not find pipeline connection details. Workload Identity Federation may not work as expected.');
        }

        // Set variables for WorkloadIdentityFederation
        tl.setVariable(ApplicationIdVariableName, servicePrincipalId, true);
        tl.setVariable(TenantIdVariableName, tenantId, true);

        // For WorkloadIdentityFederation, we don't have a client secret
        // The connection string should indicate federated credentials
        const dataverseConnectionString = `AuthType=ClientSecret;url=${environmentUrl};ClientId=${servicePrincipalId};UseFederatedCredentials=true`;
        tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

        tl.debug('WorkloadIdentityFederation configuration complete');
        break;
      }

      // Handle traditional ClientSecret authentication
      const applicationId = authorization.parameters['applicationId'];
      const clientSecret = authorization.parameters['clientSecret'];
      const tenantId = authorization.parameters['tenantId'];

      if (!applicationId || !clientSecret || !tenantId) {
        throw new Error('ApplicationId, ClientSecret, and TenantId are required for Service Principal authentication');
      }

      tl.setVariable(ApplicationIdVariableName, applicationId, true);
      tl.setVariable(ClientSecretVariableName, clientSecret, true);
      tl.setVariable(TenantIdVariableName, tenantId, true);

      const dataverseConnectionString = `AuthType=ClientSecret;url=${environmentUrl};ClientId=${applicationId};ClientSecret=${clientSecret}`;
      tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

      break;
    }

    case 'PowerPlatformEnvironment': {
      const powerPlatformEnvironment = tl.getInputRequired(authenticationType);
      const authorization = tl.getEndpointAuthorization(powerPlatformEnvironment, false);
      
      if (!authorization) {
        throw new Error(`Could not get credentials for endpoint: ${powerPlatformEnvironment}`);
      }

      const userName = authorization.parameters['UserName'] || authorization.parameters['username'];
      const password = authorization.parameters['Password'] || authorization.parameters['password'];
      
      if (!userName || !password) {
        throw new Error('UserName and Password are required for PowerPlatformEnvironment authentication');
      }

      tl.setVariable(UserNameVariableName, userName, true);
      tl.setVariable(PasswordVariableName, password, true);
      
      const applicationId = tl.getInputRequired('ApplicationId');
      const redirectUri = tl.getInputRequired('RedirectUri');

      const dataverseConnectionString = `AuthType=OAuth;url=${environmentUrl};UserName=${userName};Password=${password};AppId=${applicationId};RedirectUri=${redirectUri}`;
      tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

      break;
    }

    default:
      throw new Error(`Unsupported authentication type: ${authenticationType}`);
  }
}

// Build the OIDC token request URL for Workload Identity Federation
// Docs: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/oidctoken/create?view=azure-devops-rest-7.2
function buildIdTokenRequestUrl(serviceConnectionId: string): string {
  // Azure DevOps OIDC API version - update if newer stable version becomes available
  const OIDC_API_VERSION = '7.2-preview.1';
  
  const projectId = tl.getVariable('System.TeamProjectId');
  const hub = tl.getVariable("System.HostType");
  const planId = tl.getVariable('System.PlanId');
  const jobId = tl.getVariable('System.JobId');
  let uri = tl.getVariable("System.CollectionUri");
  
  if (!uri) {
      uri = tl.getVariable("System.TeamFoundationServerUri");
  }

  if (!projectId || !hub || !planId || !jobId || !uri) {
    throw new Error('Required Azure DevOps system variables are not available');
  }

  const tokenRequestUrl = `${uri}${projectId}/_apis/distributedtask/hubs/${hub}/plans/${planId}/jobs/${jobId}/oidctoken?serviceConnectionId=${serviceConnectionId}&api-version=${OIDC_API_VERSION}`;
  return tokenRequestUrl;
}

// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools with WorkloadIdentityFederation and ManagedServiceIdentity support

import * as tl from "azure-pipelines-task-lib/task";
import * as azdev from "azure-devops-node-api";
import * as fs from "fs";
import * as path from "path";
import { isRunningOnAgent } from "../../params/auth/isRunningOnAgent";
import {
  EnvUrlVariableName,
  ApplicationIdVariableName,
  TenantIdVariableName,
  AuthenticationTypeVariableName,
} from "../../host/PipelineVariables";

(async () => {
  if (isRunningOnAgent()) {
    await main();
  }
})().catch((error) => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const authenticationType = tl.getInputRequired("authenticationType");

  switch (authenticationType) {
    case "PowerPlatformSPN": {
      const powerPlatformSPN = tl.getInputRequired(authenticationType);
      const authorization = tl.getEndpointAuthorization(
        powerPlatformSPN,
        false,
      );
      const url = tl.getEndpointUrl(powerPlatformSPN, false)!;

      if (!authorization) {
        throw new Error(
          `Could not get credentials for endpoint: ${powerPlatformSPN}`,
        );
      }

      tl.setVariable(EnvUrlVariableName, url, false);

      await handlePowerPlatformSpnAuthorization(
        powerPlatformSPN,
        authorization,
      );

      break;
    }

    default:
      throw new Error(`Unsupported authentication type: ${authenticationType}`);
  }
}

async function handlePowerPlatformSpnAuthorization(
  powerPlatformSPN: string,
  authorization: tl.EndpointAuthorization,
): Promise<void> {
  tl.debug(`Auth Scheme: ${authorization.scheme}`);

  switch (authorization.scheme) {
    case "WorkloadIdentityFederation":
      await handleWorkloadIdentityFederation(powerPlatformSPN, authorization);
      break;

    case "ManagedServiceIdentity":
      handleManagedServiceIdentity(authorization);
      break;

    case "None":
      handleClientSecretAuthentication(authorization);
      break;

    default:
      throw new Error(
        `Unsupported authentication scheme: ${authorization.scheme}`,
      );
  }
}

async function handleWorkloadIdentityFederation(
  powerPlatformSPN: string,
  authorization: tl.EndpointAuthorization,
): Promise<void> {
  tl.debug("Configuring WorkloadIdentityFederation authentication");

  const servicePrincipalId = authorization.parameters["serviceprincipalid"];
  const tenantId = authorization.parameters["tenantid"];

  if (!servicePrincipalId || !tenantId) {
    throw new Error(
      "ServicePrincipalId and TenantId are required for WorkloadIdentityFederation",
    );
  }

  tl.debug(
    "Acquiring Workload Identity Federation details from pipeline service connection",
  );

  tl.setVariable(ApplicationIdVariableName, servicePrincipalId, false);
  tl.setVariable(TenantIdVariableName, tenantId, false);
  tl.setVariable(
    AuthenticationTypeVariableName,
    "WorkloadIdentityFederation",
    false,
  );

  tl.debug("Setting Azure environment variables for WorkloadIdentityFederation");

  const oidcToken = await getOidcToken(powerPlatformSPN);

  const tempDir =
    tl.getVariable("Agent.TempDirectory") ||
    tl.getVariable("system.DefaultWorkingDirectory") ||
    process.cwd();
  const uniqueTokenFileName = `azure_federated_token_${Date.now()}_${process.pid}`;
  const tokenFilePath = path.join(tempDir, uniqueTokenFileName);

  fs.writeFileSync(tokenFilePath, oidcToken);

  tl.setVariable("AZURE_TENANT_ID", tenantId, false);
  tl.setVariable("AZURE_CLIENT_ID", servicePrincipalId, false);
  tl.setVariable("AZURE_FEDERATED_TOKEN_FILE", tokenFilePath, false);
  tl.setVariable(
    "AZURE_AUTHORITY_HOST",
    "https://login.microsoftonline.com/",
    false,
  );
  tl.setVariable("AZURE_CLIENT_SECRET", "", false); // Clear any existing client secret variable for WorkloadIdentityFederation auth

  tl.debug(
    "Azure environment variables set for DefaultAzureCredential and WorkloadIdentityCredential compatibility",
  );
  tl.debug("WorkloadIdentityFederation configuration complete");
}

function handleManagedServiceIdentity(
  authorization: tl.EndpointAuthorization,
): void {
  tl.debug("Configuring ManagedServiceIdentity authentication");

  const managedIdentityClientId = authorization.parameters["serviceprincipalid"];
  const tenantId = authorization.parameters["tenantid"];

  tl.setVariable(
    ApplicationIdVariableName,
    managedIdentityClientId ?? "",
    false,
  );
  tl.setVariable(TenantIdVariableName, tenantId ?? "", false);
  tl.setVariable(AuthenticationTypeVariableName, "ManagedServiceIdentity", false);

  if (tenantId) {
    tl.setVariable("AZURE_TENANT_ID", tenantId, false);
  }

  if (managedIdentityClientId) {
    tl.setVariable("AZURE_CLIENT_ID", managedIdentityClientId, false);
    tl.debug(
      "ManagedServiceIdentity client ID detected; configured user-assigned managed identity support",
    );
  } else {
    tl.debug(
      "No client ID supplied for ManagedServiceIdentity; relying on host-provided system-assigned managed identity",
    );
  }

    tl.setVariable("AZURE_CLIENT_SECRET", "", true); // Clear any existing client secret variable for MSI auth);

  tl.debug("ManagedServiceIdentity configuration complete");
}

function handleClientSecretAuthentication(
  authorization: tl.EndpointAuthorization,
): void {
  const applicationId = authorization.parameters["applicationId"];
  const clientSecret = authorization.parameters["clientSecret"];
  const tenantId = authorization.parameters["tenantId"];

  if (!applicationId || !clientSecret || !tenantId) {
    throw new Error(
      "ApplicationId, ClientSecret, and TenantId are required for Service Principal authentication",
    );
  }

  tl.setVariable(ApplicationIdVariableName, applicationId, false);
  tl.setVariable(TenantIdVariableName, tenantId, false);
  tl.setVariable(AuthenticationTypeVariableName, "ClientSecret", false);
  tl.setVariable("AZURE_TENANT_ID", tenantId, false);
  tl.setVariable("AZURE_CLIENT_ID", applicationId, false);
  tl.setVariable("AZURE_CLIENT_SECRET", clientSecret, true);
}

// Fetch OIDC token from Azure DevOps (based on kubelogin.ts implementation)
async function getOidcToken(serviceConnectionId: string): Promise<string> {
  const jobId = tl.getVariable("System.JobId");
  const planId = tl.getVariable("System.PlanId");
  const projectId = tl.getVariable("System.TeamProjectId");
  const hub = tl.getVariable("System.HostType");
  const uri = tl.getVariable("System.CollectionUri");

  if (!jobId || !planId || !projectId || !hub || !uri) {
    throw new Error(
      "Required Azure DevOps system variables are not available for OIDC token fetch",
    );
  }

  // Get the system access token
  const systemAuth = tl.getEndpointAuthorization("SYSTEMVSSCONNECTION", false);
  if (
    !systemAuth ||
    systemAuth.scheme !== "OAuth" ||
    !systemAuth.parameters["AccessToken"]
  ) {
    throw new Error("Could not get system access token for OIDC token request");
  }

  const accessToken = systemAuth.parameters["AccessToken"];

  const authHandler = azdev.getHandlerFromToken(accessToken);
  const connection = new azdev.WebApi(uri, authHandler);
  const api = await connection.getTaskApi();
  const response = await api.createOidcToken(
    {},
    projectId,
    hub,
    planId,
    jobId,
    serviceConnectionId,
  );

  if (response && response.oidcToken) {
    tl.debug("Successfully fetched OIDC token");
    return response.oidcToken;
  } else {
    throw new Error("OIDC token not found in response");
  }
}

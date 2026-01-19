// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools

import * as tl from 'azure-pipelines-task-lib/task';

export type AuthenticationType = "PowerPlatformEnvironment" | "PowerPlatformSPN";

export function getAuthenticationType(defaultAuthType?: AuthenticationType): AuthenticationType {
  const authenticationType = tl.getInput('authenticationType');
  if (authenticationType) {
    return authenticationType as AuthenticationType;
  }
  if (defaultAuthType) {
    return defaultAuthType;
  }
  throw new Error('authenticationType input is required');
}

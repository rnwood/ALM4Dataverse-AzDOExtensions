// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools

import * as tl from 'azure-pipelines-task-lib/task';
import { AuthenticationType } from './getAuthenticationType';

export function getEndpointName(authenticationType: AuthenticationType): string {
  const endpointName = tl.getInput(authenticationType, true);
  if (!endpointName) {
    throw new Error(`Could not get endpoint name for authentication type: ${authenticationType}`);
  }
  return endpointName;
}

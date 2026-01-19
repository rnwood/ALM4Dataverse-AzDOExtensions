// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools

import * as tl from 'azure-pipelines-task-lib/task';

export function getEnvironmentUrl(): string {
  let environmentUrl = tl.getInput('Environment');
  
  if (!environmentUrl) {
    environmentUrl = tl.getVariable('BuildTools.EnvironmentUrl');
  }
  
  if (!environmentUrl) {
    throw new Error('Environment URL is required. Please provide it via the Environment input or BuildTools.EnvironmentUrl variable.');
  }
  
  return environmentUrl;
}

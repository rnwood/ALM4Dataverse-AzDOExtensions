// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools

import * as tl from 'azure-pipelines-task-lib/task';

export function isRunningOnAgent(): boolean {
  return tl.getVariable('AGENT_NAME') !== undefined;
}

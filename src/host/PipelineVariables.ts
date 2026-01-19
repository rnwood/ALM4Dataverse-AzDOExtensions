// Copyright (c) ALM4Dataverse
// Based on Microsoft Power Platform Build Tools

import * as tl from 'azure-pipelines-task-lib/task';

const VariableNamePrefix = "BuildTools.";
export const EnvUrlVariableName = `${VariableNamePrefix}EnvironmentUrl`;
export const ApplicationIdVariableName = `${VariableNamePrefix}ApplicationId`;
export const ClientSecretVariableName = `${VariableNamePrefix}ClientSecret`;
export const TenantIdVariableName = `${VariableNamePrefix}TenantId`;
export const DataverseConnectionStringVariableName = `${VariableNamePrefix}DataverseConnectionString`;
export const UserNameVariableName = `${VariableNamePrefix}UserName`;
export const PasswordVariableName = `${VariableNamePrefix}Password`;
export const IdTokenRequestUrlVariableName = `${VariableNamePrefix}IdTokenRequestUrl`;
export const AdoIdTokenRequestUrlVariableName = `${VariableNamePrefix}AdoIdTokenRequestUrl`;
export const AdoIdTokenRequestTokenVariableName = `${VariableNamePrefix}AdoIdTokenRequestToken`;
export const AuthenticationTypeVariableName = `${VariableNamePrefix}AuthenticationType`;

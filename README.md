# ALM4Dataverse Azure DevOps Extensions

Azure DevOps tasks for ALM4Dataverse with enhanced support for **WorkloadIdentityFederation** authentication in addition to traditional Service Principal and username/password authentication methods.

## Overview

This extension provides an enhanced version of the Power Platform set-connection-variables task that supports modern authentication schemes including:

- **WorkloadIdentityFederation** - Secure, passwordless authentication using Azure AD Workload Identity Federation
- **Service Principal with Client Secret** - Traditional SPN authentication with application ID and client secret
- **Username/Password** - Basic authentication (no MFA support)

## Features

### Set Connection Variables Task

Sets `BuildTools.*` pipeline variables from a Power Platform service connection, providing downstream custom script tasks with a single source of truth for authentication credentials.

**Key Enhancement**: Full support for **WorkloadIdentityFederation** authentication scheme, enabling secure, passwordless authentication to Power Platform environments.

#### Output Variables

The task sets the following pipeline variables:

- `BuildTools.EnvironmentUrl` - The Power Platform environment URL
- `BuildTools.ApplicationId` - Application/Service Principal ID
- `BuildTools.TenantId` - Azure AD Tenant ID
- `BuildTools.ClientSecret` - Client secret (only for ClientSecret auth, marked as secret)
- `BuildTools.UserName` - Username (only for username/password auth, marked as secret)
- `BuildTools.Password` - Password (only for username/password auth, marked as secret)
- `BuildTools.DataverseConnectionString` - Complete Dataverse connection string
- `BuildTools.IdTokenRequestUrl` - OIDC token request URL (only for WorkloadIdentityFederation auth)

## Usage

### Prerequisites

1. An Azure DevOps organization
2. A Power Platform environment
3. A service connection configured in Azure DevOps

### Service Connection Setup

#### WorkloadIdentityFederation (Recommended)

1. In Azure AD, create an App Registration
2. Configure Federated Credentials for Azure DevOps
3. Grant the app appropriate permissions to your Power Platform environment
4. Create a service connection in Azure DevOps with:
   - Authentication scheme: **WorkloadIdentityFederation**
   - Service Principal ID
   - Tenant ID

#### Service Principal with Client Secret

1. Create an App Registration in Azure AD
2. Create a client secret
3. Grant permissions to Power Platform environment
4. Create a service connection with:
   - Application ID
   - Client Secret
   - Tenant ID

### Task Configuration

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'
```

### Using Output Variables

After running the task, use the output variables in subsequent steps:

```yaml
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Environment URL: $(BuildTools.EnvironmentUrl)"
      Write-Host "Application ID: $(BuildTools.ApplicationId)"
      Write-Host "Connection String available for custom scripts"
```

## How WorkloadIdentityFederation Works

When using WorkloadIdentityFederation:

1. The task extracts the Service Principal ID and Tenant ID from the service connection
2. It builds an OIDC token request URL using Azure DevOps system variables
3. It sets environment variables (`PAC_ADO_ID_TOKEN_REQUEST_URL` and `PAC_ADO_ID_TOKEN_REQUEST_TOKEN`) that downstream tools can use to acquire federated tokens
4. It sets the `BuildTools.IdTokenRequestUrl` pipeline variable with the OIDC token request URL for use in custom scripts
5. It generates a Dataverse connection string with `UseFederatedCredentials=true`

This enables passwordless authentication without managing client secrets.

## Building the Extension

### Install Dependencies

```bash
npm install
```

### Compile TypeScript

```bash
npm run build
```

### Package the Extension

```bash
npm install -g tfx-cli
tfx extension create --manifest-globs vss-extension.json
```

## Project Structure

```
.
├── src/
│   ├── tasks/
│   │   └── set-connection-variables/
│   │       ├── index.ts          # Main task implementation
│   │       └── task.json         # Task metadata
│   ├── params/
│   │   └── auth/
│   │       ├── getAuthenticationType.ts
│   │       ├── getEndpointName.ts
│   │       ├── getEnvironmentUrl.ts
│   │       └── isRunningOnAgent.ts
│   └── host/
│       └── PipelineVariables.ts  # Variable name definitions
├── dist/                          # Compiled output
├── package.json
├── tsconfig.json
└── vss-extension.json            # Extension manifest
```

## Reference

This implementation is based on the Microsoft Power Platform Build Tools:
- [set-connection-variables-v2](https://github.com/microsoft/powerplatform-build-tools/tree/main/src/tasks/set-connection-variables/set-connection-variables-v2)
- [whoami-v2](https://github.com/microsoft/powerplatform-build-tools/blob/main/src/tasks/whoami/whoami-v2/index.ts)

With extensions to support WorkloadIdentityFederation authentication as implemented in the [getCredentials.ts](https://github.com/microsoft/powerplatform-build-tools/blob/main/src/params/auth/getCredentials.ts) module.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
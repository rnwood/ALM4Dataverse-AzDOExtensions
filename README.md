# ALM4Dataverse Azure DevOps Extensions

Azure DevOps tasks for ALM4Dataverse with enhanced support for **WorkloadIdentityFederation** and **ManagedServiceIdentity** authentication in addition to traditional Service Principal authentication.

## Overview

This extension provides an enhanced version of the Power Platform set-connection-variables task that supports modern authentication schemes including:

- **WorkloadIdentityFederation** - Secure, passwordless authentication using Azure AD Workload Identity Federation
- **ManagedServiceIdentity** - Passwordless authentication using an Azure-hosted managed identity
- **Service Principal with Client Secret** - Traditional SPN authentication with application ID and client secret

## Features

### Set Connection Variables Task

Sets `ALM4DataverseSetConnectionVariables.*` pipeline variables from a Power Platform service connection, providing downstream custom script tasks with a single source of truth for authentication credentials.

**Key Enhancements**:

- Full support for **WorkloadIdentityFederation** authentication scheme, enabling secure, passwordless authentication to Power Platform environments.
- Support for **ManagedServiceIdentity** authentication scheme, including user-assigned identities via `AZURE_CLIENT_ID` and system-assigned identities via the host environment.
- Sets the `AZURE_` environment variables that allow many tools to authenticate automatically or easily.

#### Output Variables

The task sets the following pipeline variables:

- `ALM4DataverseSetConnectionVariables.EnvironmentUrl` - The Power Platform environment URL
- `ALM4DataverseSetConnectionVariables.ApplicationId` - Application/Service Principal ID
- `ALM4DataverseSetConnectionVariables.TenantId` - Azure AD Tenant ID
- `ALM4DataverseSetConnectionVariables.AuthenticationType` - The authentication type used (WorkloadIdentityFederation, ManagedServiceIdentity, or ClientSecret)

The task also sets the `AZURE_` environment variables:
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET` for client secret auth only - This is a secret, so must be specifically mapped to any tasks that need it
- `AZURE_AUTHORITY_HOST` for Workload Identity Federated auth only
- `AZURE_FEDERATED_TOKEN_FILE` for Workload Identity Federated auth only

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

#### ManagedServiceIdentity

1. Run the agent on an Azure resource that has a managed identity available
2. Grant that managed identity appropriate permissions to your Power Platform environment
3. Create a Power Platform service connection in Azure DevOps with:
  - Authentication scheme: **ManagedServiceIdentity**
  - Tenant ID when required by your configuration
  - Client ID when using a user-assigned managed identity

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
    setAzureEnvironmentVariables: true  # Enable automatic Azure SDK integration
```

#### Parameters

- **authenticationType** (required): Must be `PowerPlatformSPN` (Service Principal)
- **PowerPlatformSPN**: Service connection name for Service Principal authentication

### Using Output Variables

After running the task, use the output variables in subsequent steps:

```yaml
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Environment URL: $(ALM4DataverseSetConnectionVariables.EnvironmentUrl)"
      Write-Host "Application ID: $(ALM4DataverseSetConnectionVariables.ApplicationId)"
```

### Using with DefaultAzureCredential

Azure SDK environment variables are set automatically:

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'

# Now any tool using DefaultAzureCredential will automatically authenticate
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      pac auth create --managedIdentity --environment $(ALM4DataverseSetConnectionVariables.EnvironmentUrl)
  env:
    # This is a secret, so must be specifically mapped
    AZURE_CLIENT_SECRET: $(AZURE_CLIENT_SECRET)
```

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

With extensions to support WorkloadIdentityFederation and ManagedServiceIdentity authentication as implemented in the [getCredentials.ts](https://github.com/microsoft/powerplatform-build-tools/blob/main/src/params/auth/getCredentials.ts) module.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
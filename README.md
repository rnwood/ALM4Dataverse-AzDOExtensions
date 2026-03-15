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
- `BuildTools.AdoIdTokenRequestUrl` - Azure DevOps OIDC token request URL for PAC tools (only for WorkloadIdentityFederation auth)
- `BuildTools.AdoIdTokenRequestToken` - Azure DevOps OAuth access token for OIDC requests (only for WorkloadIdentityFederation auth, marked as secret)
- `BuildTools.AuthenticationType` - The authentication type used (WorkloadIdentityFederation, ClientSecret, or UsernamePassword)

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
    setAzureEnvironmentVariables: true  # Enable automatic Azure SDK integration
```

#### Parameters

- **authenticationType** (required): Choose between `PowerPlatformSPN` (Service Principal) or `PowerPlatformEnvironment` (Username/Password)
- **PowerPlatformSPN**: Service connection name for Service Principal authentication
- **PowerPlatformEnvironment**: Service connection name for Username/Password authentication
- **Environment**: Power Platform environment URL (optional, defaults to `$(BuildTools.EnvironmentUrl)`)
- **ApplicationId**: Required for Username/Password authentication
- **RedirectUri**: Required for Username/Password authentication
- **setAzureEnvironmentVariables** (optional): When `true`, automatically sets `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` environment variables for seamless integration with Azure SDK's `DefaultAzureCredential`. For WorkloadIdentityFederation, also fetches and stores the OIDC token in a temporary file (`AZURE_FEDERATED_TOKEN_FILE`) for optimal compatibility with both `DefaultAzureCredential` and `WorkloadIdentityCredential`.

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

### Using with DefaultAzureCredential

**Option 1: Automatic Integration (Recommended)**

Set `setAzureEnvironmentVariables: true` to automatically configure Azure environment variables:

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'
    setAzureEnvironmentVariables: true

# Now any tool using DefaultAzureCredential will automatically authenticate
- task: AzureCLI@2
  displayName: 'Use Azure CLI with Auto Authentication'
  inputs:
    azureSubscription: 'MyAzureSubscription'
    scriptType: 'pscore'
    scriptLocation: 'inlineScript'
    inlineScript: |
      # Azure CLI will use the environment variables set by the task
      az account show

- script: |
    echo "AZURE_TENANT_ID: $AZURE_TENANT_ID"
    echo "AZURE_CLIENT_ID: $AZURE_CLIENT_ID"
    # Your applications using Azure SDK will automatically authenticate
  displayName: 'Verify Auto-Configuration'
```

**Option 2: Manual Mapping**

Alternatively, manually map the output variables to Azure SDK environment variables:

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'
    # setAzureEnvironmentVariables: false (using manual mapping instead)

# Map BuildTools variables to Azure environment variables for DefaultAzureCredential
- task: PowerShell@2
  displayName: 'Set Azure Credential Environment Variables'
  inputs:
    targetType: 'inline'
    script: |
      # Common variables for all auth types
      Write-Host "##vso[task.setvariable variable=AZURE_TENANT_ID]$(BuildTools.TenantId)"
      Write-Host "##vso[task.setvariable variable=AZURE_CLIENT_ID]$(BuildTools.ApplicationId)"
      
      # Auth-type specific variables
      $authType = "$(BuildTools.AuthenticationType)"
      Write-Host "Authentication Type: $authType"
      
      if ($authType -eq "ClientSecret") {
        # For Service Principal with Client Secret
        Write-Host "##vso[task.setvariable variable=AZURE_CLIENT_SECRET;issecret=true]$(BuildTools.ClientSecret)"
        Write-Host "Configured AZURE_CLIENT_SECRET for ClientSecret authentication"
      }
      elseif ($authType -eq "WorkloadIdentityFederation") {
        # For Workload Identity Federation, Azure SDK will use OIDC token from Azure DevOps
        # When using setAzureEnvironmentVariables: true, the task automatically:
        # - Fetches OIDC token from Azure DevOps API
        # - Writes it to a temporary file
        # - Sets AZURE_FEDERATED_TOKEN_FILE to point to that file
        # - Sets AZURESUBSCRIPTION_* variables and AZURE_AUTHORITY_HOST
        Write-Host "Configured for WorkloadIdentityFederation - DefaultAzureCredential will use OIDC token file"
      }

# Now any tool using DefaultAzureCredential will automatically authenticate
- task: AzureCLI@2
  displayName: 'Use Azure CLI with Auto Authentication'
  inputs:
    azureSubscription: 'MyAzureSubscription'
    scriptType: 'pscore'
    scriptLocation: 'inlineScript'
    inlineScript: |
      # DefaultAzureCredential will use the environment variables set above
      # Works with WorkloadIdentityFederation, ClientSecret, or any other auth type
      az account show
```

**Key Points:**
- `AZURE_TENANT_ID` maps to `BuildTools.TenantId`
- `AZURE_CLIENT_ID` maps to `BuildTools.ApplicationId`
- `AZURE_CLIENT_SECRET` maps to `BuildTools.ClientSecret` (for ClientSecret auth only)
- For WorkloadIdentityFederation, the Azure SDK automatically detects the Azure DevOps OIDC environment
- The `BuildTools.AuthenticationType` variable allows conditional logic based on the auth method

This approach ensures that tools using Azure SDK's `DefaultAzureCredential` (Azure CLI, PowerShell Az modules, .NET applications, etc.) will automatically authenticate without requiring code changes, regardless of which authentication method is configured.

## How WorkloadIdentityFederation Works

When using WorkloadIdentityFederation:

1. The task extracts the Service Principal ID and Tenant ID from the service connection
2. It builds an OIDC token request URL using Azure DevOps system variables
3. It sets environment variables (`PAC_ADO_ID_TOKEN_REQUEST_URL` and `PAC_ADO_ID_TOKEN_REQUEST_TOKEN`) that downstream tools can use to acquire federated tokens
4. It exposes these values as pipeline output variables:
   - `BuildTools.IdTokenRequestUrl` - The OIDC token request URL
   - `BuildTools.AdoIdTokenRequestUrl` - Same as PAC_ADO_ID_TOKEN_REQUEST_URL for downstream tasks
   - `BuildTools.AdoIdTokenRequestToken` - The Azure DevOps OAuth token (secret)
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
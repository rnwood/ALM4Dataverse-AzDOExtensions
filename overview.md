# ALM4Dataverse Azure DevOps Extensions

Enhance your Power Platform ALM pipeline with modern authentication support including **WorkloadIdentityFederation**.

## Key Features

### 🔐 Modern Authentication Support
- **WorkloadIdentityFederation** - Secure, passwordless authentication using Azure AD Workload Identity
- **Service Principal with Client Secret** - Traditional SPN authentication
- **Username/Password** - Basic authentication support

### ⚡ Set Connection Variables Task
Sets `BuildTools.*` pipeline variables from Power Platform service connections, providing downstream tasks with standardized authentication credentials.

#### Output Variables
- `BuildTools.EnvironmentUrl` - Power Platform environment URL
- `BuildTools.ApplicationId` - Application/Service Principal ID  
- `BuildTools.TenantId` - Azure AD Tenant ID
- `BuildTools.DataverseConnectionString` - Complete connection string
- `BuildTools.AuthenticationType` - Authentication method used
- Additional auth-specific variables (secrets, tokens, etc.)

## Quick Start

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'
    setAzureEnvironmentVariables: true

# Use output variables in subsequent steps
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Environment: $(BuildTools.EnvironmentUrl)"
      Write-Host "App ID: $(BuildTools.ApplicationId)"
```

## Azure SDK Integration

**Automatic Integration (New!)** - Enable seamless Azure SDK authentication:

```yaml
- task: ALM4DataverseSetConnectionVariables@1
  inputs:
    authenticationType: 'PowerPlatformSPN'
    PowerPlatformSPN: 'MyPowerPlatformConnection'
    Environment: 'https://myorg.crm.dynamics.com'
    setAzureEnvironmentVariables: true  # 🔥 New parameter!

# Azure CLI, PowerShell Az, and .NET apps now auto-authenticate
- task: AzureCLI@2
  inputs:
    scriptType: 'pscore'
    scriptLocation: 'inlineScript'
    inlineScript: 'az account show'  # No manual auth needed!
```

**Manual Integration** - For advanced scenarios, map output variables manually:

```yaml
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "##vso[task.setvariable variable=AZURE_TENANT_ID]$(BuildTools.TenantId)"
      Write-Host "##vso[task.setvariable variable=AZURE_CLIENT_ID]$(BuildTools.ApplicationId)"
      
      if ("$(BuildTools.AuthenticationType)" -eq "ClientSecret") {
        Write-Host "##vso[task.setvariable variable=AZURE_CLIENT_SECRET;issecret=true]$(BuildTools.ClientSecret)"
      }
```

This enables automatic authentication for Azure CLI, PowerShell Az modules, and .NET applications without code changes. For Azure Pipelines Workload Identity Federation, fetches and stores OIDC tokens in temporary files and sets additional environment variables (`AZURESUBSCRIPTION_*`, `AZURE_FEDERATED_TOKEN_FILE`) for optimal compatibility with both `DefaultAzureCredential` and `WorkloadIdentityCredential`.

## Why WorkloadIdentityFederation?

- **Enhanced Security** - No client secrets to manage or rotate
- **Simplified Setup** - Leverages Azure AD federated credentials
- **Modern Standard** - Microsoft's recommended authentication approach
- **Passwordless** - Eliminates credential storage risks

Perfect for organizations adopting modern DevOps security practices and zero-trust architectures.
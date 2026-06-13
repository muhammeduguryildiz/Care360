@description('Environment tag, e.g. prod or staging')
param env string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Your Entra tenant ID')
param tenantId string

@description('Entra app client ID for SWA admin authentication')
param entraClientId string

var prefix = 'care360status${env}'
var tags = { environment: env, project: 'care360-statusportal' }

// ── Storage ───────────────────────────────────────────────────────────────────
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    name: '${prefix}st'
    tags: tags
  }
}

// ── App Insights ──────────────────────────────────────────────────────────────
module appInsights 'modules/appinsights.bicep' = {
  name: 'appinsights'
  params: {
    location: location
    name: '${prefix}-ai'
    tags: tags
  }
}

// ── Function App (probes + API) ───────────────────────────────────────────────
module functionApp 'modules/functionapp.bicep' = {
  name: 'functionapp'
  params: {
    location: location
    name: '${prefix}-func'
    storageAccountName: storage.outputs.name
    storageTableEndpoint: storage.outputs.tableEndpoint
    keyVaultUri: keyVault.outputs.uri
    appInsightsConnectionString: appInsights.outputs.connectionString
    tags: tags
  }
}

// ── Key Vault ─────────────────────────────────────────────────────────────────
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    name: '${prefix}-kv'
    tenantId: tenantId
    functionAppPrincipalId: functionApp.outputs.principalId
    tags: tags
  }
}

// ── Static Web App (frontend) ─────────────────────────────────────────────────
module swa 'modules/swa.bicep' = {
  name: 'swa'
  params: {
    location: location
    name: '${prefix}-swa'
    functionAppResourceId: functionApp.outputs.resourceId
    entraClientId: entraClientId
    tags: tags
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output swaHostname string = swa.outputs.defaultHostName
output functionAppHostname string = functionApp.outputs.defaultHostName
output keyVaultUri string = keyVault.outputs.uri
output appInsightsWorkspaceId string = appInsights.outputs.workspaceId
output swaDeploymentToken string = swa.outputs.deploymentToken

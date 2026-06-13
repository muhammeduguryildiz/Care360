param location string
param name string
param functionAppResourceId string
param entraClientId string
param tags object = {}

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {
    buildProperties: {
      skipGithubActionWorkflowGeneration: true
    }
  }
}

// Link the standalone Function App as BYO backend
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-01-01' = {
  parent: swa
  name: 'backend'
  properties: {
    backendResourceId: functionAppResourceId
    region: location
  }
}

// SWA app settings for Entra auth
resource swaSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    AZURE_CLIENT_ID: entraClientId
  }
}

output resourceId string = swa.id
output defaultHostName string = swa.properties.defaultHostname
output deploymentToken string = listSecrets(swa.id, '2023-01-01').properties.apiKey

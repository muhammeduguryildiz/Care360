using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Security.KeyVault.Secrets;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Probes;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((ctx, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddHttpClient();

        var keyVaultUri = ctx.Configuration["KeyVaultUri"];
        if (!string.IsNullOrEmpty(keyVaultUri))
        {
            services.AddSingleton(_ =>
                new SecretClient(new Uri(keyVaultUri), new DefaultAzureCredential()));
        }
        else
        {
            services.AddSingleton<SecretClient>(_ => null!);
        }

        services.AddSingleton(_ => new LogsQueryClient(new DefaultAzureCredential()));

        services.AddSingleton<SecretResolver>();
        services.AddSingleton<StatusRepository>();
        services.AddSingleton<StatusEngine>();

        services.AddSingleton<HttpEndpointProbe>();
        services.AddSingleton<FnoAvailabilityProbe>();
        services.AddSingleton<AppInsightsKqlProbe>();
        services.AddSingleton<AzureDevOpsProbe>();
        services.AddSingleton<SqlProbe>();
        services.AddSingleton<ServiceBusProbe>();
        services.AddSingleton<ProbeFactory>();

        services.AddHostedService<TableInitializer>();
    })
    .Build();

host.Run();

using Azure.Messaging.ServiceBus.Administration;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Checks an Azure Service Bus queue: active message depth and dead-letter count.
/// Uses Azure.Messaging.ServiceBus.Administration.ServiceBusAdministrationClient.
/// Auth: connection string (Key Vault) or managed identity (NamespaceUri).
/// </summary>
public class ServiceBusProbe : IProbe
{
    private readonly SecretResolver _secrets;
    private readonly ILogger<ServiceBusProbe> _logger;

    public ServiceBusProbe(SecretResolver secrets, ILogger<ServiceBusProbe> logger)
    {
        _secrets = secrets;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<ServiceBusParams>();
        var thresholds = cfg.GetThresholds();

        if (string.IsNullOrWhiteSpace(p.QueueName))
            return ProbeResult.Unknown("QueueName not configured");

        try
        {
            ServiceBusAdministrationClient adminClient;

            if (!string.IsNullOrWhiteSpace(p.NamespaceUri))
            {
                adminClient = new ServiceBusAdministrationClient(
                    p.NamespaceUri, new Azure.Identity.DefaultAzureCredential());
            }
            else if (!string.IsNullOrWhiteSpace(p.ConnectionStringSecretRef))
            {
                var connStr = await _secrets.ResolveAsync(p.ConnectionStringSecretRef, ct);
                adminClient = new ServiceBusAdministrationClient(connStr);
            }
            else
            {
                return ProbeResult.Unknown("Neither NamespaceUri nor ConnectionStringSecretRef configured");
            }

            var props = await adminClient.GetQueueRuntimePropertiesAsync(p.QueueName, ct);
            var activeCount = props.Value.ActiveMessageCount;
            var dlCount = props.Value.DeadLetterMessageCount;

            var details = new Dictionary<string, string>
            {
                ["activeMessages"] = activeCount.ToString(),
                ["deadLetterMessages"] = dlCount.ToString(),
                ["queueName"] = p.QueueName
            };

            if (dlCount > thresholds.MaxDeadLetterCount)
                return ProbeResult.Unhealthy(
                    $"Dead-letter count {dlCount} exceeds threshold {thresholds.MaxDeadLetterCount}", 0, details);

            if (activeCount > thresholds.MaxQueueDepth)
                return ProbeResult.Degraded(
                    $"Queue depth {activeCount} exceeds threshold {thresholds.MaxQueueDepth}", 0, details);

            if (dlCount > thresholds.MaxDeadLetterCount / 2)
                return ProbeResult.Degraded(
                    $"Dead-letter count {dlCount} is elevated", 0, details);

            return ProbeResult.Healthy(
                $"Queue healthy — {activeCount} active, {dlCount} DLQ", 0, details);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ServiceBusProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy(ex.Message);
        }
    }

    private record ServiceBusParams
    {
        // Use managed identity (recommended in Azure)
        public string NamespaceUri { get; init; } = string.Empty;
        // Or connection string from Key Vault (local dev or when MI isn't set up)
        public string ConnectionStringSecretRef { get; init; } = string.Empty;
        public string QueueName { get; init; } = string.Empty;
    }
}

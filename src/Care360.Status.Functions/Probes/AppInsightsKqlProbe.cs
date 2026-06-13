using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Queries your own Application Insights resource via KQL (Azure Monitor Logs API, Entra OAuth2).
/// Used for F&amp;O application telemetry: X++ exception rate, batch failures,
/// batch resource-pressure events (CPU/mem/SQL DTU), DMF job failures.
///
/// IMPORTANT: These signals are event-driven, not continuous counters.
/// The Status shown reflects whether recent telemetry shows problems — not a live gauge.
/// Clearly flag this in the UI.
///
/// Auth: Managed Identity of the Function App must have
///   "Monitoring Reader" role on the App Insights resource (or Log Analytics workspace).
/// </summary>
public class AppInsightsKqlProbe : IProbe
{
    private readonly LogsQueryClient _logsClient;
    private readonly StatusEngine _engine;
    private readonly ILogger<AppInsightsKqlProbe> _logger;

    public AppInsightsKqlProbe(LogsQueryClient logsClient, StatusEngine engine,
        ILogger<AppInsightsKqlProbe> logger)
    {
        _logsClient = logsClient;
        _engine = engine;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<KqlParams>();
        var thresholds = cfg.GetThresholds();

        if (string.IsNullOrWhiteSpace(p.WorkspaceId) || string.IsNullOrWhiteSpace(p.Kql))
            return ProbeResult.Unknown("WorkspaceId or KQL query not configured");

        var lookback = TimeSpan.FromMinutes(p.LookbackMinutes > 0 ? p.LookbackMinutes : 30);

        try
        {
            var response = await _logsClient.QueryWorkspaceAsync(
                p.WorkspaceId, p.Kql,
                new QueryTimeRange(lookback),
                cancellationToken: ct);

            var table = response.Value.Table;
            if (table.Rows.Count == 0)
                return ProbeResult.Healthy($"No events in last {p.LookbackMinutes} min (nominal)");

            // Expect the KQL to project a single numeric column named "value" or "count"
            var row = table.Rows[0];
            var colName = p.MetricColumn is { Length: > 0 } c ? c : "value";
            double metricValue = 0;

            if (table.Columns.Any(col => col.Name == colName))
            {
                var rawVal = row[colName];
                metricValue = rawVal is double d ? d : Convert.ToDouble(rawVal);
            }
            else
            {
                // Fall back to count of rows
                metricValue = table.Rows.Count;
            }

            var details = new Dictionary<string, string>
            {
                [colName] = metricValue.ToString("F2"),
                ["lookbackMinutes"] = p.LookbackMinutes.ToString(),
                ["rowCount"] = table.Rows.Count.ToString()
            };

            if (metricValue >= thresholds.UnhealthyErrorRate * 100 || metricValue > p.UnhealthyThreshold)
                return ProbeResult.Unhealthy(
                    $"{p.MetricLabel}: {metricValue:F1}{p.Unit} (threshold exceeded)", 0, details);

            if (metricValue >= thresholds.DegradedErrorRate * 100 || metricValue > p.DegradedThreshold)
                return ProbeResult.Degraded(
                    $"{p.MetricLabel}: {metricValue:F1}{p.Unit} (elevated)", 0, details);

            return ProbeResult.Healthy($"{p.MetricLabel}: {metricValue:F1}{p.Unit} (nominal)", 0, details);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AppInsightsKqlProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unknown($"KQL query failed: {ex.Message}");
        }
    }

    private record KqlParams
    {
        // Log Analytics Workspace ID (GUID) — NOT the App Insights resource ID
        public string WorkspaceId { get; init; } = string.Empty;
        // KQL query — should project a column named by MetricColumn (default "value")
        public string Kql { get; init; } = string.Empty;
        public int LookbackMinutes { get; init; } = 30;
        public string MetricColumn { get; init; } = "value";
        public string MetricLabel { get; init; } = "Count";
        public string Unit { get; init; } = string.Empty;
        public double DegradedThreshold { get; init; } = 5;
        public double UnhealthyThreshold { get; init; } = 20;
    }
}

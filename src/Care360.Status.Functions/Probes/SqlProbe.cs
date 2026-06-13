using System.Diagnostics;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Connectivity probe for a customer-owned Azure SQL database (BYOD or integration DB).
/// NOT for AxDB — direct SQL access to production AxDB is not allowed in Microsoft-managed F&amp;O.
/// Executes SELECT 1 and measures round-trip latency.
/// </summary>
public class SqlProbe : IProbe
{
    private readonly SecretResolver _secrets;
    private readonly StatusEngine _engine;
    private readonly ILogger<SqlProbe> _logger;

    public SqlProbe(SecretResolver secrets, StatusEngine engine, ILogger<SqlProbe> logger)
    {
        _secrets = secrets;
        _engine = engine;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<SqlParams>();
        var thresholds = cfg.GetThresholds();

        if (string.IsNullOrWhiteSpace(p.ConnectionStringSecretRef))
            return ProbeResult.Unknown("ConnectionStringSecretRef not configured");

        var connStr = await _secrets.ResolveAsync(p.ConnectionStringSecretRef, ct);
        if (string.IsNullOrEmpty(connStr))
            return ProbeResult.Unknown("SQL connection string secret not resolved");

        var sw = Stopwatch.StartNew();
        try
        {
            await using var conn = new SqlConnection(connStr);
            await conn.OpenAsync(ct);

            await using var cmd = new SqlCommand("SELECT 1", conn);
            cmd.CommandTimeout = 10;
            await cmd.ExecuteScalarAsync(ct);
            sw.Stop();

            return _engine.EvaluateLatency(sw.ElapsedMilliseconds, thresholds,
                $"SQL ping {sw.ElapsedMilliseconds} ms");
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            return ProbeResult.Unhealthy("Timeout", sw.ElapsedMilliseconds);
        }
        catch (SqlException ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "SqlProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy($"SQL error {ex.Number}: {ex.Message}", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "SqlProbe unexpected error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    private record SqlParams
    {
        public string ConnectionStringSecretRef { get; init; } = string.Empty;
    }
}

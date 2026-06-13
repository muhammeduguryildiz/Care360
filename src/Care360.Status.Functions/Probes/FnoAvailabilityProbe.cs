using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Synthetic availability probe for Microsoft-managed D365 F&amp;O.
/// Flow: Entra client-credentials token → OData service root /data → measure latency.
/// 429 → Degraded (throttled), not Unhealthy.
///
/// Setup (one-time per environment):
///   1. Register an Entra ID app (client credentials) in Azure Portal.
///   2. In F&amp;O: System admin → Setup → Microsoft Entra ID applications → add the client ID.
///   3. Store the client secret in Key Vault (see FnoParams.ClientSecretRef).
/// </summary>
public class FnoAvailabilityProbe : IProbe
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly SecretResolver _secrets;
    private readonly StatusEngine _engine;
    private readonly ILogger<FnoAvailabilityProbe> _logger;

    public FnoAvailabilityProbe(IHttpClientFactory httpFactory, SecretResolver secrets,
        StatusEngine engine, ILogger<FnoAvailabilityProbe> logger)
    {
        _httpFactory = httpFactory;
        _secrets = secrets;
        _engine = engine;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<FnoParams>();
        var thresholds = cfg.GetThresholds();

        if (string.IsNullOrWhiteSpace(p.EnvironmentUrl))
            return ProbeResult.Unknown("EnvironmentUrl not configured");

        try
        {
            var token = await AcquireTokenAsync(p, ct);
            if (token is null)
                return ProbeResult.Unhealthy("Failed to acquire Entra token");

            var baseUrl = p.EnvironmentUrl.TrimEnd('/');
            var probeUrl = $"{baseUrl}/data";

            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var sw = Stopwatch.StartNew();
            using var response = await client.GetAsync(probeUrl, ct);
            sw.Stop();

            var statusCode = (int)response.StatusCode;

            if (statusCode == 429)
            {
                _logger.LogWarning("F&O throttled (429) for {Component}", cfg.ComponentId);
                return ProbeResult.Degraded("F&O throttled (429) — transient", sw.ElapsedMilliseconds);
            }

            if (!response.IsSuccessStatusCode)
                return ProbeResult.Unhealthy($"OData responded HTTP {statusCode}", sw.ElapsedMilliseconds);

            return _engine.EvaluateLatency(sw.ElapsedMilliseconds, thresholds,
                $"F&O OData available ({sw.ElapsedMilliseconds} ms)");
        }
        catch (TaskCanceledException)
        {
            return ProbeResult.Unhealthy("Timeout");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "FnoAvailabilityProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy(ex.Message);
        }
    }

    private async Task<string?> AcquireTokenAsync(FnoParams p, CancellationToken ct)
    {
        var clientId = !string.IsNullOrEmpty(p.ClientIdSecretRef)
            ? await _secrets.ResolveAsync(p.ClientIdSecretRef, ct)
            : p.ClientId;

        var clientSecret = await _secrets.ResolveAsync(p.ClientSecretRef, ct);

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            _logger.LogError("F&O client credentials not configured");
            return null;
        }

        var tokenUrl = $"https://login.microsoftonline.com/{p.TenantId}/oauth2/v2.0/token";
        var resource = p.EnvironmentUrl.TrimEnd('/');

        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["scope"] = $"{resource}/.default"
        });

        var http = _httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(20);

        var resp = await http.PostAsync(tokenUrl, body, ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogError("Token endpoint returned {Status}", resp.StatusCode);
            return null;
        }

        var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        return json.RootElement.GetProperty("access_token").GetString();
    }

    private record FnoParams
    {
        public string EnvironmentUrl { get; init; } = string.Empty;
        public string TenantId { get; init; } = string.Empty;
        // Either supply ClientId directly (for local dev) or via a Key Vault secret name
        public string ClientId { get; init; } = string.Empty;
        public string ClientIdSecretRef { get; init; } = string.Empty;
        public string ClientSecretRef { get; init; } = string.Empty;
    }
}

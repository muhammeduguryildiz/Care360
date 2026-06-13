using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Generic HTTP endpoint probe. Supports GET/POST, optional auth (none/apikey/bearer),
/// optional response body substring check.
/// </summary>
public class HttpEndpointProbe : IProbe
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly SecretResolver _secrets;
    private readonly StatusEngine _engine;
    private readonly ILogger<HttpEndpointProbe> _logger;

    public HttpEndpointProbe(IHttpClientFactory httpFactory, SecretResolver secrets,
        StatusEngine engine, ILogger<HttpEndpointProbe> logger)
    {
        _httpFactory = httpFactory;
        _secrets = secrets;
        _engine = engine;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<HttpParams>();
        var thresholds = cfg.GetThresholds();

        if (string.IsNullOrWhiteSpace(p.Url))
            return ProbeResult.Unknown("URL not configured");

        var client = _httpFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);

        // Auth
        if (p.AuthType == "apikey" && !string.IsNullOrEmpty(p.AuthSecretRef))
        {
            var key = await _secrets.ResolveAsync(p.AuthSecretRef, ct);
            var headerName = string.IsNullOrEmpty(p.AuthHeader) ? "X-Api-Key" : p.AuthHeader;
            client.DefaultRequestHeaders.TryAddWithoutValidation(headerName, key);
        }
        else if (p.AuthType == "bearer" && !string.IsNullOrEmpty(p.AuthSecretRef))
        {
            var token = await _secrets.ResolveAsync(p.AuthSecretRef, ct);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
        }

        var sw = Stopwatch.StartNew();
        try
        {
            using var request = new HttpRequestMessage(
                new HttpMethod(p.Method ?? "GET"), p.Url);

            using var response = await client.SendAsync(request, ct);
            sw.Stop();

            var statusCode = (int)response.StatusCode;

            if (thresholds.UnhealthyStatusCodes.Contains(statusCode) || statusCode >= 500)
                return ProbeResult.Unhealthy($"HTTP {statusCode}", sw.ElapsedMilliseconds);

            if (statusCode == 429)
                return ProbeResult.Degraded($"Throttled (429)", sw.ElapsedMilliseconds);

            if (thresholds.DegradedStatusCodes.Contains(statusCode))
                return ProbeResult.Degraded($"HTTP {statusCode}", sw.ElapsedMilliseconds);

            if (statusCode >= 400)
                return ProbeResult.Unhealthy($"HTTP {statusCode}", sw.ElapsedMilliseconds);

            // Optional body check
            if (!string.IsNullOrEmpty(p.BodyContains))
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                if (!body.Contains(p.BodyContains, StringComparison.OrdinalIgnoreCase))
                    return ProbeResult.Unhealthy(
                        $"Response body does not contain expected string", sw.ElapsedMilliseconds);
            }

            int expectedStatus = p.ExpectedStatus > 0 ? p.ExpectedStatus : 200;
            if (statusCode != expectedStatus)
                return ProbeResult.Degraded($"Expected HTTP {expectedStatus}, got {statusCode}",
                    sw.ElapsedMilliseconds);

            return _engine.EvaluateLatency(sw.ElapsedMilliseconds, thresholds,
                $"HTTP {statusCode} in {sw.ElapsedMilliseconds} ms");
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            return ProbeResult.Unhealthy("Timeout", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "HttpEndpointProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    private record HttpParams
    {
        public string Url { get; init; } = string.Empty;
        public string Method { get; init; } = "GET";
        public int ExpectedStatus { get; init; } = 200;
        public string BodyContains { get; init; } = string.Empty;
        // "none" | "apikey" | "bearer"
        public string AuthType { get; init; } = "none";
        public string AuthHeader { get; init; } = string.Empty;
        public string AuthSecretRef { get; init; } = string.Empty;
    }
}

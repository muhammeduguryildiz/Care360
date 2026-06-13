using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Probes;

/// <summary>
/// Checks the last run of an Azure DevOps pipeline (build definition or YAML pipeline).
/// Auth: PAT stored in Key Vault. Scope needed: Build (Read).
/// API: GET https://dev.azure.com/{org}/{project}/_apis/build/builds?definitions={id}&$top=1&api-version=7.1
/// </summary>
public class AzureDevOpsProbe : IProbe
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly SecretResolver _secrets;
    private readonly ILogger<AzureDevOpsProbe> _logger;

    public AzureDevOpsProbe(IHttpClientFactory httpFactory, SecretResolver secrets,
        ILogger<AzureDevOpsProbe> logger)
    {
        _httpFactory = httpFactory;
        _secrets = secrets;
        _logger = logger;
    }

    public async Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct)
    {
        var p = cfg.GetParams<DevOpsParams>();

        if (string.IsNullOrWhiteSpace(p.Organization) || p.DefinitionId <= 0)
            return ProbeResult.Unknown("Organization or DefinitionId not configured");

        try
        {
            var pat = await _secrets.ResolveAsync(p.PatSecretRef, ct);
            if (string.IsNullOrEmpty(pat))
                return ProbeResult.Unknown("PAT secret not resolved");

            var project = Uri.EscapeDataString(p.Project);
            var url =
                $"https://dev.azure.com/{p.Organization}/{project}/_apis/build/builds" +
                $"?definitions={p.DefinitionId}&$top=1&api-version=7.1";

            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            var encoded = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{pat}"));
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Basic", encoded);

            var sw = Stopwatch.StartNew();
            using var response = await client.GetAsync(url, ct);
            sw.Stop();

            if (!response.IsSuccessStatusCode)
                return ProbeResult.Unhealthy($"DevOps API returned {response.StatusCode}");

            var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var builds = json.RootElement.GetProperty("value");

            if (builds.GetArrayLength() == 0)
                return ProbeResult.Unknown("No builds found for this pipeline");

            var latest = builds[0];
            var result = latest.TryGetProperty("result", out var r) ? r.GetString() : null;
            var status = latest.TryGetProperty("status", out var s) ? s.GetString() : null;
            var buildNumber = latest.TryGetProperty("buildNumber", out var bn) ? bn.GetString() : "?";
            var startTime = latest.TryGetProperty("startTime", out var st)
                ? st.GetDateTimeOffset() : (DateTimeOffset?)null;

            var details = new Dictionary<string, string>
            {
                ["buildNumber"] = buildNumber ?? "?",
                ["status"] = status ?? "?",
                ["result"] = result ?? "inProgress",
                ["startTime"] = startTime?.ToString("u") ?? "?"
            };

            // still running
            if (status == "inProgress" || status == "notStarted")
                return ProbeResult.Healthy($"Build {buildNumber} in progress", sw.ElapsedMilliseconds, details);

            return result switch
            {
                "succeeded" => ProbeResult.Healthy($"Build {buildNumber} succeeded", sw.ElapsedMilliseconds, details),
                "partiallySucceeded" => ProbeResult.Degraded($"Build {buildNumber} partially succeeded", sw.ElapsedMilliseconds, details),
                "failed" => ProbeResult.Unhealthy($"Build {buildNumber} failed", sw.ElapsedMilliseconds, details),
                "canceled" => ProbeResult.Degraded($"Build {buildNumber} was cancelled", sw.ElapsedMilliseconds, details),
                _ => ProbeResult.Unknown($"Build {buildNumber} result: {result}")
            };
        }
        catch (TaskCanceledException)
        {
            return ProbeResult.Unhealthy("Timeout");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AzureDevOpsProbe error for {Component}", cfg.ComponentId);
            return ProbeResult.Unhealthy(ex.Message);
        }
    }

    private record DevOpsParams
    {
        public string Organization { get; init; } = string.Empty;
        public string Project { get; init; } = string.Empty;
        public int DefinitionId { get; init; }
        public string PatSecretRef { get; init; } = "devops-pat";
    }
}

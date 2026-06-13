using System.Text;
using System.Text.Json;
using Care360.Status.Functions.Core;
using Care360.Status.Functions.Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Functions;

/// <summary>
/// Admin API — gated by Entra ID via SWA route rules + x-ms-client-principal validation.
/// All routes under /api/admin/* are blocked by staticwebapp.config.json to unauthenticated requests.
/// The function still validates the principal header as defense-in-depth.
/// </summary>
public class AdminApi
{
    private readonly StatusRepository _repository;
    private readonly ILogger<AdminApi> _logger;

    public AdminApi(StatusRepository repository, ILogger<AdminApi> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    // ── Components ───────────────────────────────────────────────────────────

    [Function("AdminGetComponents")]
    public async Task<IActionResult> GetComponents(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "admin/components")] HttpRequest req,
        CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();
        var configs = await _repository.GetAllComponentsAsync(ct);
        return new OkObjectResult(configs.Select(ComponentConfigDto.From));
    }

    [Function("AdminCreateComponent")]
    public async Task<IActionResult> CreateComponent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "admin/components")] HttpRequest req,
        CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();

        var dto = await ReadBodyAsync<UpsertComponentDto>(req, ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.ComponentId) || string.IsNullOrWhiteSpace(dto.ProbeType))
            return new BadRequestObjectResult("componentId and probeType are required");

        var config = new ComponentConfig
        {
            PartitionKey = dto.ProbeType.ToLower(),
            RowKey = dto.ComponentId.ToLower(),
            DisplayName = dto.DisplayName ?? dto.ComponentId,
            Group = dto.Group ?? "General",
            IntervalSeconds = dto.IntervalSeconds > 0 ? dto.IntervalSeconds : 60,
            Enabled = dto.Enabled ?? true,
            ParamsJson = dto.ParamsJson ?? "{}",
            ThresholdsJson = dto.ThresholdsJson ?? "{}"
        };

        await _repository.UpsertComponentAsync(config, ct);
        return new CreatedResult($"/api/admin/components/{config.RowKey}", ComponentConfigDto.From(config));
    }

    [Function("AdminUpdateComponent")]
    public async Task<IActionResult> UpdateComponent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "admin/components/{id}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();

        var dto = await ReadBodyAsync<UpsertComponentDto>(req, ct);
        if (dto is null) return new BadRequestObjectResult("Invalid body");

        var all = await _repository.GetAllComponentsAsync(ct);
        var existing = all.FirstOrDefault(c =>
            c.ComponentId.Equals(id, StringComparison.OrdinalIgnoreCase));

        if (existing is null) return new NotFoundResult();

        existing.DisplayName = dto.DisplayName ?? existing.DisplayName;
        existing.Group = dto.Group ?? existing.Group;
        existing.IntervalSeconds = dto.IntervalSeconds > 0 ? dto.IntervalSeconds : existing.IntervalSeconds;
        existing.Enabled = dto.Enabled ?? existing.Enabled;
        existing.ParamsJson = dto.ParamsJson ?? existing.ParamsJson;
        existing.ThresholdsJson = dto.ThresholdsJson ?? existing.ThresholdsJson;

        await _repository.UpsertComponentAsync(existing, ct);
        return new OkObjectResult(ComponentConfigDto.From(existing));
    }

    [Function("AdminDeleteComponent")]
    public async Task<IActionResult> DeleteComponent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "admin/components/{id}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();

        var all = await _repository.GetAllComponentsAsync(ct);
        var existing = all.FirstOrDefault(c =>
            c.ComponentId.Equals(id, StringComparison.OrdinalIgnoreCase));

        if (existing is null) return new NotFoundResult();

        await _repository.DeleteComponentAsync(existing.ProbeType, existing.ComponentId, ct);
        return new NoContentResult();
    }

    // ── Incidents ─────────────────────────────────────────────────────────────

    [Function("AdminCreateIncident")]
    public async Task<IActionResult> CreateIncident(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "admin/incidents")] HttpRequest req,
        CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();

        var dto = await ReadBodyAsync<UpsertIncidentDto>(req, ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.Title))
            return new BadRequestObjectResult("title is required");

        var now = DateTimeOffset.UtcNow;
        var incident = new Incident
        {
            PartitionKey = now.ToString("yyyyMM"),
            RowKey = HistoryRow.ReverseTicks(now),
            Title = dto.Title,
            Body = dto.Body ?? string.Empty,
            IncidentStatus = dto.IncidentStatus ?? "investigating",
            Severity = dto.Severity ?? "minor",
            AffectedComponentIds = dto.AffectedComponentIds is { Length: > 0 }
                ? string.Join(",", dto.AffectedComponentIds)
                : string.Empty,
            CreatedAt = now,
            Active = true
        };

        await _repository.UpsertIncidentAsync(incident, ct);
        return new CreatedResult($"/api/incidents", IncidentDto.From(incident));
    }

    [Function("AdminUpdateIncident")]
    public async Task<IActionResult> UpdateIncident(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "admin/incidents/{month}/{rowKey}")] HttpRequest req,
        string month, string rowKey, CancellationToken ct)
    {
        if (!IsAuthorized(req)) return new UnauthorizedResult();

        var dto = await ReadBodyAsync<UpsertIncidentDto>(req, ct);
        if (dto is null) return new BadRequestObjectResult("Invalid body");

        // Read existing incident first
        var incidents = await _repository.GetIncidentsAsync(months: 6, ct: ct);
        var existing = incidents.FirstOrDefault(i =>
            i.PartitionKey == month && i.RowKey == rowKey);

        if (existing is null) return new NotFoundResult();

        if (dto.Title is not null) existing.Title = dto.Title;
        if (dto.Body is not null) existing.Body = dto.Body;
        if (dto.IncidentStatus is not null)
        {
            existing.IncidentStatus = dto.IncidentStatus;
            if (dto.IncidentStatus == "resolved")
            {
                existing.Active = false;
                existing.ResolvedAt ??= DateTimeOffset.UtcNow;
            }
        }
        if (dto.Severity is not null) existing.Severity = dto.Severity;
        if (dto.AffectedComponentIds is not null)
            existing.AffectedComponentIds = string.Join(",", dto.AffectedComponentIds);

        await _repository.UpsertIncidentAsync(existing, ct);
        return new OkObjectResult(IncidentDto.From(existing));
    }

    // ── Auth helper ───────────────────────────────────────────────────────────

    private static bool IsAuthorized(HttpRequest req)
    {
        var header = req.Headers["x-ms-client-principal"].FirstOrDefault();
        if (string.IsNullOrEmpty(header)) return false;

        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(header));
            using var doc = JsonDocument.Parse(json);
            var roles = doc.RootElement
                .GetProperty("userRoles")
                .EnumerateArray()
                .Select(r => r.GetString() ?? string.Empty)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            return roles.Contains("authenticated") || roles.Contains("admin");
        }
        catch
        {
            return false;
        }
    }

    private static async Task<T?> ReadBodyAsync<T>(HttpRequest req, CancellationToken ct)
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<T>(req.Body,
                new JsonSerializerOptions(JsonSerializerDefaults.Web), ct);
        }
        catch
        {
            return default;
        }
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

file record ComponentConfigDto
{
    public string ComponentId { get; init; } = default!;
    public string ProbeType { get; init; } = default!;
    public string DisplayName { get; init; } = default!;
    public string Group { get; init; } = default!;
    public int IntervalSeconds { get; init; }
    public bool Enabled { get; init; }
    public string ParamsJson { get; init; } = "{}";
    public string ThresholdsJson { get; init; } = "{}";

    public static ComponentConfigDto From(ComponentConfig c) => new()
    {
        ComponentId = c.RowKey,
        ProbeType = c.PartitionKey,
        DisplayName = c.DisplayName,
        Group = c.Group,
        IntervalSeconds = c.IntervalSeconds,
        Enabled = c.Enabled,
        ParamsJson = c.ParamsJson,
        ThresholdsJson = c.ThresholdsJson
    };
}

file record UpsertComponentDto
{
    public string? ComponentId { get; init; }
    public string? ProbeType { get; init; }
    public string? DisplayName { get; init; }
    public string? Group { get; init; }
    public int IntervalSeconds { get; init; }
    public bool? Enabled { get; init; }
    public string? ParamsJson { get; init; }
    public string? ThresholdsJson { get; init; }
}

file record UpsertIncidentDto
{
    public string? Title { get; init; }
    public string? Body { get; init; }
    public string? IncidentStatus { get; init; }
    public string? Severity { get; init; }
    public string[]? AffectedComponentIds { get; init; }
}

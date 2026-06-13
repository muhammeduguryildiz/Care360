using System.Text.Json;
using Care360.Status.Functions.Core.Models;

namespace Care360.Status.Functions.Core;

public class StatusEngine
{
    public ProbeResult EvaluateLatency(long responseTimeMs, ProbeThresholds thresholds,
        string okMessage = "OK", Dictionary<string, string>? details = null)
    {
        if (responseTimeMs >= thresholds.UnhealthyMs)
            return ProbeResult.Unhealthy($"Response too slow ({responseTimeMs} ms)", responseTimeMs, details);
        if (responseTimeMs >= thresholds.DegradedMs)
            return ProbeResult.Degraded($"Response slow ({responseTimeMs} ms)", responseTimeMs, details);
        return ProbeResult.Healthy(okMessage, responseTimeMs, details);
    }

    public ComponentStatus WorstOf(IEnumerable<ComponentStatus> statuses) =>
        statuses.DefaultIfEmpty(ComponentStatus.Unknown).Max();

    public ComponentStatus ParseStatus(string value) =>
        Enum.TryParse<ComponentStatus>(value, out var s) ? s : ComponentStatus.Unknown;

    public StatusResponse BuildResponse(
        IEnumerable<StatusSnapshot> snapshots,
        IEnumerable<Incident> activeIncidents)
    {
        var snapshotList = snapshots.ToList();
        var incidentList = activeIncidents.ToList();

        var groups = snapshotList
            .GroupBy(s => s.Group)
            .OrderBy(g => g.Key)
            .Select(g => new ComponentGroupDto
            {
                Name = g.Key,
                Components = g.OrderBy(s => s.DisplayName)
                              .Select(ComponentDto.From)
                              .ToList()
            })
            .ToList();

        var overall = WorstOf(snapshotList.Select(s => ParseStatus(s.Status)));

        return new StatusResponse
        {
            Overall = overall.ToString(),
            CheckedAt = DateTimeOffset.UtcNow,
            Groups = groups,
            ActiveIncidents = incidentList.Select(IncidentDto.From).ToList()
        };
    }
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

public record StatusResponse
{
    public string Overall { get; init; } = ComponentStatus.Unknown.ToString();
    public DateTimeOffset CheckedAt { get; init; }
    public List<ComponentGroupDto> Groups { get; init; } = new();
    public List<IncidentDto> ActiveIncidents { get; init; } = new();
}

public record ComponentGroupDto
{
    public string Name { get; init; } = default!;
    public List<ComponentDto> Components { get; init; } = new();
}

public record ComponentDto
{
    public string Id { get; init; } = default!;
    public string Name { get; init; } = default!;
    public string ProbeType { get; init; } = default!;
    public string Status { get; init; } = ComponentStatus.Unknown.ToString();
    public long ResponseTimeMs { get; init; }
    public string Message { get; init; } = string.Empty;
    public DateTimeOffset? CheckedAt { get; init; }
    public DateTimeOffset? LastChangedAt { get; init; }

    public static ComponentDto From(StatusSnapshot s) => new()
    {
        Id = s.RowKey,
        Name = s.DisplayName,
        ProbeType = s.ProbeType,
        Status = s.Status,
        ResponseTimeMs = s.ResponseTimeMs,
        Message = s.Message,
        CheckedAt = s.CheckedAt,
        LastChangedAt = s.LastChangedAt
    };
}

public record IncidentDto
{
    public string Id { get; init; } = default!;
    public string Title { get; init; } = default!;
    public string Body { get; init; } = string.Empty;
    public string Status { get; init; } = "investigating";
    public string Severity { get; init; } = "minor";
    public string[] AffectedComponents { get; init; } = Array.Empty<string>();
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ResolvedAt { get; init; }

    public static IncidentDto From(Incident i) => new()
    {
        Id = $"{i.PartitionKey}/{i.RowKey}",
        Title = i.Title,
        Body = i.Body,
        Status = i.IncidentStatus,
        Severity = i.Severity,
        AffectedComponents = string.IsNullOrEmpty(i.AffectedComponentIds)
            ? Array.Empty<string>()
            : i.AffectedComponentIds.Split(',', StringSplitOptions.RemoveEmptyEntries),
        CreatedAt = i.CreatedAt,
        ResolvedAt = i.ResolvedAt
    };
}

public record HistoryResponse
{
    public string ComponentId { get; init; } = default!;
    public string Range { get; init; } = "7d";
    public double UptimePercent { get; init; }
    public List<HistoryPointDto> Series { get; init; } = new();
}

public record HistoryPointDto
{
    public DateTimeOffset CheckedAt { get; init; }
    public string Status { get; init; } = default!;
    public long ResponseTimeMs { get; init; }
    public string Message { get; init; } = string.Empty;
}

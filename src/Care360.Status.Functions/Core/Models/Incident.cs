using Azure;
using Azure.Data.Tables;

namespace Care360.Status.Functions.Core.Models;

public class Incident : ITableEntity
{
    // PartitionKey = "yyyyMM" of CreatedAt
    // RowKey       = reverse-ticks of CreatedAt (newest first within month)
    public string PartitionKey { get; set; } = default!;
    public string RowKey { get; set; } = default!;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Title { get; set; } = default!;
    public string Body { get; set; } = string.Empty;

    // "investigating" | "identified" | "monitoring" | "resolved"
    public string IncidentStatus { get; set; } = "investigating";

    // "minor" | "major" | "critical" | "maintenance"
    public string Severity { get; set; } = "minor";

    // Comma-separated component IDs — Table Storage cannot store arrays natively
    public string AffectedComponentIds { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public bool Active { get; set; } = true;
}

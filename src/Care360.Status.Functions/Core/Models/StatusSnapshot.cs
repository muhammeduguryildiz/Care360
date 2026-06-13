using Azure;
using Azure.Data.Tables;

namespace Care360.Status.Functions.Core.Models;

public class StatusSnapshot : ITableEntity
{
    // PartitionKey = "status"  (constant — allows a single partition scan for the status page)
    // RowKey       = ComponentId
    public string PartitionKey { get; set; } = "status";
    public string RowKey { get; set; } = default!;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string DisplayName { get; set; } = default!;
    public string Group { get; set; } = "General";
    public string ProbeType { get; set; } = default!;
    public string Status { get; set; } = ComponentStatus.Unknown.ToString();
    public long ResponseTimeMs { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset? CheckedAt { get; set; }
    public DateTimeOffset? LastChangedAt { get; set; }
    public string DetailsJson { get; set; } = "{}";
}

using Azure;
using Azure.Data.Tables;

namespace Care360.Status.Functions.Core.Models;

public class HistoryRow : ITableEntity
{
    // PartitionKey = ComponentId
    // RowKey       = reverse-ticks (newest first): DateTime.MaxValue.Ticks - UtcNow.Ticks, padded D19
    public string PartitionKey { get; set; } = default!;
    public string RowKey { get; set; } = default!;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Status { get; set; } = default!;
    public long ResponseTimeMs { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CheckedAt { get; set; }

    public static string ReverseTicks(DateTimeOffset at) =>
        (DateTime.MaxValue.Ticks - at.UtcTicks).ToString("D19");
}

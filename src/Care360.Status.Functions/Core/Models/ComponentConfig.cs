using System.Runtime.Serialization;
using System.Text.Json;
using Azure;
using Azure.Data.Tables;
using Care360.Status.Functions.Core.Models;

namespace Care360.Status.Functions.Core.Models;

public class ComponentConfig : ITableEntity
{
    // PartitionKey = ProbeType  (e.g. "http", "fno", "devops", "appinsights", "sql", "servicebus")
    // RowKey       = ComponentId (e.g. "crm-api", "fno-prod", "deploy-pipeline")
    public string PartitionKey { get; set; } = default!;
    public string RowKey { get; set; } = default!;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string DisplayName { get; set; } = default!;
    public string Group { get; set; } = "General";
    public int IntervalSeconds { get; set; } = 60;
    public bool Enabled { get; set; } = true;

    // Serialised JSON columns — probes read these via GetParams<T>()
    public string ParamsJson { get; set; } = "{}";
    public string ThresholdsJson { get; set; } = "{}";

    [IgnoreDataMember]
    public string ProbeType => PartitionKey;

    [IgnoreDataMember]
    public string ComponentId => RowKey;

    public T GetParams<T>() where T : new() =>
        JsonSerializer.Deserialize<T>(string.IsNullOrWhiteSpace(ParamsJson) ? "{}" : ParamsJson,
            JsonOptions.Web) ?? new T();

    public ProbeThresholds GetThresholds() =>
        JsonSerializer.Deserialize<ProbeThresholds>(string.IsNullOrWhiteSpace(ThresholdsJson) ? "{}" : ThresholdsJson,
            JsonOptions.Web) ?? ProbeThresholds.Default;
}

internal static class JsonOptions
{
    internal static readonly JsonSerializerOptions Web =
        new(JsonSerializerDefaults.Web);
}

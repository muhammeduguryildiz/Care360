namespace Care360.Status.Functions.Core.Models;

public class ProbeResult
{
    public ComponentStatus Status { get; init; }
    public long ResponseTimeMs { get; init; }
    public string Message { get; init; } = string.Empty;
    public DateTimeOffset CheckedAt { get; init; } = DateTimeOffset.UtcNow;
    public Dictionary<string, string> Details { get; init; } = new();

    public static ProbeResult Healthy(string message = "OK", long responseTimeMs = 0,
        Dictionary<string, string>? details = null) => new()
    {
        Status = ComponentStatus.Healthy,
        Message = message,
        ResponseTimeMs = responseTimeMs,
        Details = details ?? new()
    };

    public static ProbeResult Degraded(string message, long responseTimeMs = 0,
        Dictionary<string, string>? details = null) => new()
    {
        Status = ComponentStatus.Degraded,
        Message = message,
        ResponseTimeMs = responseTimeMs,
        Details = details ?? new()
    };

    public static ProbeResult Unhealthy(string message, long responseTimeMs = 0,
        Dictionary<string, string>? details = null) => new()
    {
        Status = ComponentStatus.Unhealthy,
        Message = message,
        ResponseTimeMs = responseTimeMs,
        Details = details ?? new()
    };

    public static ProbeResult Unknown(string message = "Not yet checked") => new()
    {
        Status = ComponentStatus.Unknown,
        Message = message
    };

    public static ProbeResult Maintenance(string message = "Under maintenance") => new()
    {
        Status = ComponentStatus.Maintenance,
        Message = message
    };
}

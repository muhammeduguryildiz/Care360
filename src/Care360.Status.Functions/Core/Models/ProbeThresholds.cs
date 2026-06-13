namespace Care360.Status.Functions.Core.Models;

public record ProbeThresholds
{
    public long DegradedMs { get; init; } = 2000;
    public long UnhealthyMs { get; init; } = 10000;
    public int[] DegradedStatusCodes { get; init; } = Array.Empty<int>();
    public int[] UnhealthyStatusCodes { get; init; } = Array.Empty<int>();
    public int MaxDeadLetterCount { get; init; } = 100;
    public int MaxQueueDepth { get; init; } = 5000;
    public double DegradedErrorRate { get; init; } = 0.05;
    public double UnhealthyErrorRate { get; init; } = 0.20;

    public static readonly ProbeThresholds Default = new();
}

namespace Care360.Status.Functions.Probes;

public class ProbeFactory
{
    private readonly IReadOnlyDictionary<string, IProbe> _probes;

    public ProbeFactory(
        HttpEndpointProbe http,
        FnoAvailabilityProbe fno,
        AppInsightsKqlProbe appInsights,
        AzureDevOpsProbe devops,
        SqlProbe sql,
        ServiceBusProbe serviceBus)
    {
        _probes = new Dictionary<string, IProbe>(StringComparer.OrdinalIgnoreCase)
        {
            ["http"] = http,
            ["fno"] = fno,
            ["appinsights"] = appInsights,
            ["devops"] = devops,
            ["sql"] = sql,
            ["servicebus"] = serviceBus,
        };
    }

    public IProbe? Get(string probeType) =>
        _probes.TryGetValue(probeType, out var probe) ? probe : null;

    public IEnumerable<string> RegisteredTypes => _probes.Keys;
}

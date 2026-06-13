using Care360.Status.Functions.Core.Models;

namespace Care360.Status.Functions.Probes;

public interface IProbe
{
    Task<ProbeResult> CheckAsync(ComponentConfig cfg, CancellationToken ct);
}

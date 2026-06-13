using Care360.Status.Functions.Core;
using Care360.Status.Functions.Probes;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Functions;

public class ProbeScheduler
{
    private readonly StatusRepository _repository;
    private readonly ProbeFactory _probeFactory;
    private readonly ILogger<ProbeScheduler> _logger;
    private const int MaxConcurrent = 5;

    public ProbeScheduler(StatusRepository repository, ProbeFactory probeFactory,
        ILogger<ProbeScheduler> logger)
    {
        _repository = repository;
        _probeFactory = probeFactory;
        _logger = logger;
    }

    // Fires every minute — checks each component against its own intervalSeconds
    [Function(nameof(ProbeScheduler))]
    public async Task Run([TimerTrigger("0 */1 * * * *")] TimerInfo timer, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        var configs = await _repository.GetEnabledComponentsAsync(ct);
        if (configs.Count == 0)
        {
            _logger.LogDebug("No enabled components to probe");
            return;
        }

        var snapshots = await _repository.GetAllSnapshotsAsync(ct);
        var snapshotMap = snapshots.ToDictionary(s => s.RowKey, StringComparer.OrdinalIgnoreCase);

        var due = configs.Where(cfg =>
        {
            if (!snapshotMap.TryGetValue(cfg.ComponentId, out var snap))
                return true; // never probed
            if (snap.CheckedAt == null)
                return true;
            return (now - snap.CheckedAt.Value).TotalSeconds >= cfg.IntervalSeconds;
        }).ToList();

        _logger.LogInformation("Probe run: {Due}/{Total} components due", due.Count, configs.Count);

        var semaphore = new SemaphoreSlim(MaxConcurrent);

        await Task.WhenAll(due.Select(async cfg =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                var probe = _probeFactory.Get(cfg.ProbeType);
                if (probe is null)
                {
                    _logger.LogWarning("No probe registered for type '{Type}' (component: {Id})",
                        cfg.ProbeType, cfg.ComponentId);
                    return;
                }

                var result = await probe.CheckAsync(cfg, ct);

                await Task.WhenAll(
                    _repository.UpsertSnapshotAsync(cfg, result, ct),
                    _repository.AppendHistoryAsync(cfg.ComponentId, result, ct));

                _logger.LogDebug("{Id} → {Status} ({Ms} ms)", cfg.ComponentId, result.Status, result.ResponseTimeMs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error probing {Id}", cfg.ComponentId);
            }
            finally
            {
                semaphore.Release();
            }
        }));
    }
}

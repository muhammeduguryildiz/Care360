using Care360.Status.Functions.Core;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Functions;

public class HistoryPruner
{
    private readonly StatusRepository _repository;
    private readonly ILogger<HistoryPruner> _logger;
    private const int RetentionDays = 90;

    public HistoryPruner(StatusRepository repository, ILogger<HistoryPruner> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    // Runs at 02:00 UTC every day
    [Function(nameof(HistoryPruner))]
    public async Task Run([TimerTrigger("0 0 2 * * *")] TimerInfo timer, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-RetentionDays);
        _logger.LogInformation("Pruning history rows older than {Cutoff} ({Days}d retention)",
            cutoff, RetentionDays);

        await _repository.DeleteHistoryOlderThanAsync(cutoff, ct);
    }
}

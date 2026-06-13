using Microsoft.Extensions.Hosting;

namespace Care360.Status.Functions.Core;

public class TableInitializer : IHostedService
{
    private readonly StatusRepository _repository;

    public TableInitializer(StatusRepository repository) => _repository = repository;

    public Task StartAsync(CancellationToken ct) => _repository.EnsureTablesExistAsync(ct);

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}

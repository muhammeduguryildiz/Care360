using System.Text.Json;
using Azure;
using Azure.Data.Tables;
using Care360.Status.Functions.Core.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Core;

public class StatusRepository
{
    private readonly TableClient _components;
    private readonly TableClient _componentStatus;
    private readonly TableClient _statusHistory;
    private readonly TableClient _incidents;
    private readonly ILogger<StatusRepository> _logger;

    public StatusRepository(IConfiguration config, ILogger<StatusRepository> logger)
    {
        _logger = logger;

        var storageUri = config["StorageAccountUri"];
        TableServiceClient svc;

        if (!string.IsNullOrWhiteSpace(storageUri))
        {
            svc = new TableServiceClient(new Uri(storageUri), new Azure.Identity.DefaultAzureCredential());
        }
        else
        {
            var connStr = config["StorageConnectionString"]
                ?? config["AzureWebJobsStorage"]
                ?? "UseDevelopmentStorage=true";
            svc = new TableServiceClient(connStr);
        }

        _components = svc.GetTableClient("Components");
        _componentStatus = svc.GetTableClient("ComponentStatus");
        _statusHistory = svc.GetTableClient("StatusHistory");
        _incidents = svc.GetTableClient("Incidents");
    }

    public async Task EnsureTablesExistAsync(CancellationToken ct = default)
    {
        await Task.WhenAll(
            _components.CreateIfNotExistsAsync(ct),
            _componentStatus.CreateIfNotExistsAsync(ct),
            _statusHistory.CreateIfNotExistsAsync(ct),
            _incidents.CreateIfNotExistsAsync(ct));
        _logger.LogInformation("Storage tables verified");
    }

    // ── Component config ─────────────────────────────────────────────────────

    public async Task<List<ComponentConfig>> GetEnabledComponentsAsync(CancellationToken ct = default)
    {
        var result = new List<ComponentConfig>();
        await foreach (var e in _components.QueryAsync<ComponentConfig>(
            c => c.Enabled == true, cancellationToken: ct))
            result.Add(e);
        return result;
    }

    public async Task<List<ComponentConfig>> GetAllComponentsAsync(CancellationToken ct = default)
    {
        var result = new List<ComponentConfig>();
        await foreach (var e in _components.QueryAsync<ComponentConfig>(cancellationToken: ct))
            result.Add(e);
        return result;
    }

    public Task UpsertComponentAsync(ComponentConfig config, CancellationToken ct = default) =>
        _components.UpsertEntityAsync(config, TableUpdateMode.Replace, ct);

    public Task DeleteComponentAsync(string probeType, string componentId, CancellationToken ct = default) =>
        _components.DeleteEntityAsync(probeType, componentId, cancellationToken: ct);

    // ── Status snapshots ─────────────────────────────────────────────────────

    public async Task<List<StatusSnapshot>> GetAllSnapshotsAsync(CancellationToken ct = default)
    {
        var result = new List<StatusSnapshot>();
        await foreach (var e in _componentStatus.QueryAsync<StatusSnapshot>(
            s => s.PartitionKey == "status", cancellationToken: ct))
            result.Add(e);
        return result;
    }

    public async Task UpsertSnapshotAsync(ComponentConfig cfg, ProbeResult result, CancellationToken ct = default)
    {
        DateTimeOffset? lastChangedAt = result.CheckedAt;

        try
        {
            var existing = await _componentStatus.GetEntityAsync<StatusSnapshot>(
                "status", cfg.ComponentId, cancellationToken: ct);

            if (existing.Value.Status == result.Status.ToString())
                lastChangedAt = existing.Value.LastChangedAt;
        }
        catch (RequestFailedException ex) when (ex.Status == 404) { }

        var snap = new StatusSnapshot
        {
            PartitionKey = "status",
            RowKey = cfg.ComponentId,
            DisplayName = cfg.DisplayName,
            Group = cfg.Group,
            ProbeType = cfg.ProbeType,
            Status = result.Status.ToString(),
            ResponseTimeMs = result.ResponseTimeMs,
            Message = result.Message,
            CheckedAt = result.CheckedAt,
            LastChangedAt = lastChangedAt,
            DetailsJson = JsonSerializer.Serialize(result.Details)
        };

        await _componentStatus.UpsertEntityAsync(snap, TableUpdateMode.Replace, ct);
    }

    // ── History ──────────────────────────────────────────────────────────────

    public async Task AppendHistoryAsync(string componentId, ProbeResult result, CancellationToken ct = default)
    {
        var row = new HistoryRow
        {
            PartitionKey = componentId,
            RowKey = HistoryRow.ReverseTicks(result.CheckedAt),
            Status = result.Status.ToString(),
            ResponseTimeMs = result.ResponseTimeMs,
            Message = result.Message,
            CheckedAt = result.CheckedAt
        };
        await _statusHistory.AddEntityAsync(row, ct);
    }

    public async Task<List<HistoryRow>> GetHistoryAsync(
        string componentId, DateTimeOffset since, int maxRows = 1000, CancellationToken ct = default)
    {
        var cutoffTicks = HistoryRow.ReverseTicks(since);
        var result = new List<HistoryRow>();

        await foreach (var row in _statusHistory.QueryAsync<HistoryRow>(
            r => r.PartitionKey == componentId && string.Compare(r.RowKey, cutoffTicks) <= 0,
            maxPerPage: maxRows, cancellationToken: ct))
        {
            result.Add(row);
            if (result.Count >= maxRows) break;
        }

        return result;
    }

    public async Task DeleteHistoryOlderThanAsync(DateTimeOffset cutoff, CancellationToken ct = default)
    {
        var cutoffTicks = HistoryRow.ReverseTicks(cutoff);
        var toDelete = new List<(string pk, string rk, ETag etag)>();

        await foreach (var row in _statusHistory.QueryAsync<HistoryRow>(
            r => string.Compare(r.RowKey, cutoffTicks) > 0, cancellationToken: ct))
        {
            toDelete.Add((row.PartitionKey, row.RowKey, row.ETag));
        }

        foreach (var batch in toDelete.Chunk(100))
        {
            var groups = batch.GroupBy(r => r.pk);
            foreach (var g in groups)
            {
                var txn = g.Select(r =>
                    new TableTransactionAction(TableTransactionActionType.Delete,
                        new TableEntity(r.pk, r.rk) { ETag = r.etag }));
                try { await _statusHistory.SubmitTransactionAsync(txn, ct); }
                catch (Exception ex) { _logger.LogWarning(ex, "Batch delete partial failure"); }
            }
        }

        _logger.LogInformation("Pruned {Count} history rows older than {Cutoff}", toDelete.Count, cutoff);
    }

    // ── Incidents ─────────────────────────────────────────────────────────────

    public async Task<List<Incident>> GetActiveIncidentsAsync(CancellationToken ct = default)
    {
        var result = new List<Incident>();
        await foreach (var e in _incidents.QueryAsync<Incident>(
            i => i.Active == true, cancellationToken: ct))
            result.Add(e);
        return result.OrderByDescending(i => i.CreatedAt).ToList();
    }

    public async Task<List<Incident>> GetIncidentsAsync(int months = 3, CancellationToken ct = default)
    {
        var result = new List<Incident>();
        var partitions = Enumerable.Range(0, months)
            .Select(m => DateTimeOffset.UtcNow.AddMonths(-m).ToString("yyyyMM"))
            .ToHashSet();

        await foreach (var e in _incidents.QueryAsync<Incident>(cancellationToken: ct))
        {
            if (partitions.Contains(e.PartitionKey))
                result.Add(e);
        }

        return result.OrderByDescending(i => i.CreatedAt).ToList();
    }

    public Task UpsertIncidentAsync(Incident incident, CancellationToken ct = default) =>
        _incidents.UpsertEntityAsync(incident, TableUpdateMode.Replace, ct);
}


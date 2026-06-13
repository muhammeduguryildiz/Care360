using Care360.Status.Functions.Core;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Functions;

public class StatusApi
{
    private readonly StatusRepository _repository;
    private readonly StatusEngine _engine;
    private readonly ILogger<StatusApi> _logger;

    public StatusApi(StatusRepository repository, StatusEngine engine, ILogger<StatusApi> logger)
    {
        _repository = repository;
        _engine = engine;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/status — returns current status of all components + active incidents.
    /// Public, anonymous.
    /// </summary>
    [Function("GetStatus")]
    public async Task<IActionResult> GetStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "status")] HttpRequest req,
        CancellationToken ct)
    {
        var (snapshots, incidents) = await (
            _repository.GetAllSnapshotsAsync(ct),
            _repository.GetActiveIncidentsAsync(ct)).WhenBoth();

        var response = _engine.BuildResponse(snapshots, incidents);
        return new OkObjectResult(response);
    }

    /// <summary>
    /// GET /api/components/{id}/history?range=7d|30d|90d — history series + uptime %.
    /// Public, anonymous.
    /// </summary>
    [Function("GetComponentHistory")]
    public async Task<IActionResult> GetComponentHistory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "components/{id}/history")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var rangeStr = req.Query["range"].FirstOrDefault() ?? "7d";
        var days = rangeStr switch
        {
            "30d" => 30,
            "90d" => 90,
            _ => 7
        };

        var since = DateTimeOffset.UtcNow.AddDays(-days);
        var rows = await _repository.GetHistoryAsync(id, since, maxRows: 2000, ct: ct);

        if (rows.Count == 0)
            return new OkObjectResult(new HistoryResponse
            {
                ComponentId = id,
                Range = rangeStr,
                UptimePercent = 100,
                Series = new()
            });

        var healthyCount = rows.Count(r => r.Status == "Healthy");
        var uptime = rows.Count > 0 ? (double)healthyCount / rows.Count * 100 : 100;

        var series = rows.Select(r => new HistoryPointDto
        {
            CheckedAt = r.CheckedAt,
            Status = r.Status,
            ResponseTimeMs = r.ResponseTimeMs,
            Message = r.Message
        }).ToList();

        return new OkObjectResult(new HistoryResponse
        {
            ComponentId = id,
            Range = rangeStr,
            UptimePercent = Math.Round(uptime, 2),
            Series = series
        });
    }

    /// <summary>
    /// GET /api/incidents — recent incidents (last 3 months).
    /// Public, anonymous.
    /// </summary>
    [Function("GetIncidents")]
    public async Task<IActionResult> GetIncidents(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "incidents")] HttpRequest req,
        CancellationToken ct)
    {
        var incidents = await _repository.GetIncidentsAsync(months: 3, ct: ct);
        var dtos = incidents.Select(IncidentDto.From).ToList();
        return new OkObjectResult(dtos);
    }
}

file static class TaskExtensions
{
    internal static async Task<(T1, T2)> WhenBoth<T1, T2>(
        this (Task<T1> t1, Task<T2> t2) tasks)
    {
        await Task.WhenAll(tasks.t1, tasks.t2);
        return (tasks.t1.Result, tasks.t2.Result);
    }
}

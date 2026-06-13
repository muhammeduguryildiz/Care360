using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Logging;

namespace Care360.Status.Functions.Core;

/// <summary>
/// Resolves secret values from Azure Key Vault (production) or environment variables (local dev).
/// In local dev set the secret as an env var with the same name as the Key Vault secret name.
/// </summary>
public class SecretResolver
{
    private readonly SecretClient? _client;
    private readonly ILogger<SecretResolver> _logger;
    private readonly Dictionary<string, string> _cache = new(StringComparer.OrdinalIgnoreCase);
    private readonly SemaphoreSlim _lock = new(1, 1);

    public SecretResolver(SecretClient? client, ILogger<SecretResolver> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<string> ResolveAsync(string secretName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(secretName))
            return string.Empty;

        await _lock.WaitAsync(ct);
        try
        {
            if (_cache.TryGetValue(secretName, out var cached))
                return cached;

            string value;

            if (_client != null)
            {
                var response = await _client.GetSecretAsync(secretName, cancellationToken: ct);
                value = response.Value.Value;
            }
            else
            {
                // Local dev — fall back to environment variable
                value = Environment.GetEnvironmentVariable(secretName) ?? string.Empty;
                if (string.IsNullOrEmpty(value))
                    _logger.LogWarning("Secret '{Name}' not found in env vars (no KeyVaultUri configured)", secretName);
            }

            _cache[secretName] = value;
            return value;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void InvalidateCache() => _cache.Clear();
}

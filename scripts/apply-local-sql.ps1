param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Path
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$localSqlRoot = Resolve-Path -LiteralPath (Join-Path $repoRoot "supabase\local")
$sqlPath = Resolve-Path -LiteralPath $Path

if (-not $sqlPath.Path.StartsWith($localSqlRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Only SQL files under supabase/local can be applied with this script."
}

if ([System.IO.Path]::GetExtension($sqlPath.Path) -ne ".sql") {
  throw "Only .sql files can be applied with this script."
}

$containerName = "supabase_db_speech-m"
$runningContainer = docker ps `
  --filter "name=^/$containerName$" `
  --filter "status=running" `
  --format "{{.Names}}"

if ($runningContainer -ne $containerName) {
  throw "Local Supabase DB container '$containerName' is not running. Run 'npx supabase start' first."
}

Write-Host "Applying local-only SQL: $($sqlPath.Path)"
$sql = Get-Content -Raw -LiteralPath $sqlPath.Path
$sql | docker exec -i $containerName psql -v ON_ERROR_STOP=1 -U postgres -d postgres

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Local-only SQL applied."

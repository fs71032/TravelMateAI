$projectRoot = Split-Path $PSScriptRoot -Parent
$candidates = @(
  (Join-Path $PSScriptRoot 'TravelMateAI-ER-Diagram.drawio')
)

$diagram = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $diagram) {
  Write-Host 'ER diagram not found. Generating it now...'
  Push-Location (Join-Path $projectRoot 'backend')
  node scripts/generate_er_diagram.js
  Pop-Location
  $diagram = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $diagram) {
  Write-Error "Could not create the diagram. Run: cd $projectRoot && npm run er:diagram"
  exit 1
}

Write-Host "File: $diagram"

$drawIoPaths = @(
  (Get-AppxPackage -Name 'draw.io.draw.ioDiagrams' -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.InstallLocation 'draw.io.exe' }),
  'C:\Program Files\draw.io\draw.io.exe',
  'C:\Program Files (x86)\draw.io\draw.io.exe',
  (Join-Path $env:LOCALAPPDATA 'Programs\draw.io\draw.io.exe'),
  (Join-Path $env:LOCALAPPDATA 'draw.io\draw.io.exe')
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

foreach ($exe in $drawIoPaths) {
  try {
    Start-Process -FilePath $exe -ArgumentList "`"$diagram`""
    Write-Host "Opening in draw.io: $exe"
    exit 0
  } catch {
    Write-Warning "Could not launch $exe"
  }
}

try {
  Start-Process -FilePath $diagram
  Write-Host 'Opening with default .drawio app...'
  exit 0
} catch {
  Write-Error 'Could not open the diagram. Install draw.io Desktop or open the file manually in diagrams.net'
  exit 1
}

param(
    [string]$ExportsDirectory = $env:DCEF_EXPORTS_DIR,
    [string]$OverridePath = $env:DCEF_MONGODB_PATH
)

$ErrorActionPreference = 'Stop'

function Test-MongoDirectoryCandidate {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Container)) {
        return $false
    }

    try {
        $resolved = (Resolve-Path -LiteralPath $Path).Path
        $drive = [System.IO.DriveInfo]::new([System.IO.Path]::GetPathRoot($resolved))
        if ($drive.DriveFormat -notin @('NTFS', 'ReFS')) {
            return $false
        }

        $probePath = Join-Path $resolved ('.dcef-write-probe-' + [Guid]::NewGuid().ToString('N') + '.tmp')
        [System.IO.File]::WriteAllBytes($probePath, [byte[]]::new(0))
        Remove-Item -LiteralPath $probePath -Force
        return $true
    }
    catch {
        if ($probePath -and (Test-Path -LiteralPath $probePath)) {
            Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
        }
        return $false
    }
}

if (-not [string]::IsNullOrWhiteSpace($OverridePath)) {
    [System.IO.Path]::GetFullPath($OverridePath)
    exit 0
}

if (Test-MongoDirectoryCandidate -Path $ExportsDirectory) {
    Join-Path (Resolve-Path -LiteralPath $ExportsDirectory).Path '.dcef\mongodb'
    exit 0
}

Join-Path $env:LOCALAPPDATA 'DCEF\mongodb'

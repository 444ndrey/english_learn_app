$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$png = Join-Path $root "public\mascots\aiko.png"
$ico = Join-Path $root "aiko.ico"
$startBat = Join-Path $root "start.bat"

if (-not (Test-Path $png)) {
    throw "Mascot image not found: $png"
}
if (-not (Test-Path $startBat)) {
    Write-Warning "start.bat not found. Run 'npm run build' first so the shortcut has a target."
}

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($png)
$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, $size, $size)
$g.Dispose()
$src.Dispose()

$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$pngBytes = $ms.ToArray()
$ms.Dispose()

$fs = [System.IO.File]::Create($ico)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]1)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([Byte]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]32)
$bw.Write([UInt32]$pngBytes.Length)
$bw.Write([UInt32]22)
$bw.Write($pngBytes)
$bw.Flush()
$bw.Close()
$fs.Close()
Write-Host "Icon created: $ico"

$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "English Learning App.lnk"
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = $startBat
$lnk.WorkingDirectory = $root
$lnk.IconLocation = "$ico,0"
$lnk.Description = "English Learning App"
$lnk.Save()
Write-Host "Shortcut created: $lnkPath"

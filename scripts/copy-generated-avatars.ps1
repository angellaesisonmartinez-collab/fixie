Add-Type -AssemblyName System.Drawing
$dest = "c:\Users\Angel Lae Martinez\Downloads\itsme-fixie1 - Copy\itsme-fixie\src\assets\avatars"
$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\63ddb684-7571-4588-952a-1ab402f05588"

$map = @{
    "bianca_avatar_*.jpg" = "bianca.png"
    "chryztel_avatar_*.jpg" = "chryztel.png"
    "lester_avatar_*.jpg" = "lester.png"
    "kate_avatar_*.jpg" = "kate.png"
    "maria_ortiz_avatar_*.jpg" = "maria_ortiz.png"
    "alyssa_avatar_*.jpg" = "alyssa.png"
}

foreach ($pat in $map.Keys) {
    $src = Get-ChildItem -Path $dir -Filter $pat | Select-Object -Last 1
    if ($src) {
        $bmp = [System.Drawing.Bitmap]::FromFile($src.FullName)
        $targetFile = Join-Path $dest $map[$pat]
        $bmp.Save($targetFile, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Host "Saved $targetFile"
    } else {
        Write-Host "Not found: $pat"
    }
}

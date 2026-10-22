Add-Type -AssemblyName System.Drawing

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$assetsDir = "c:\Users\Angel Lae Martinez\Desktop\itsme-fixie1\itsme-fixie\src\assets"

$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

# Make outer corners of Image 2 transparent (anything matching outer header color #B5D1BF)
$crop2 = New-Object System.Drawing.Bitmap($img2.Width, $img2.Height)
for ($y = 0; $y -lt $img2.Height; $y++) {
    for ($x = 0; $x -lt $img2.Width; $x++) {
        $c = $img2.GetPixel($x, $y)
        # If outer green header color or black border outside
        if (($c.G -gt 170 -and $c.R -gt 140 -and $c.B -gt 150) -or ($c.R -eq 0 -and $c.G -eq 0 -and $c.B -eq 0 -and ($x -lt 5 -or $x -gt 40 -or $y -lt 5 -or $y -gt 40))) {
            $crop2.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $crop2.SetPixel($x, $y, $c)
        }
    }
}
$crop2.Save((Join-Path $assetsDir "topbar-bell-button-exact.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Make outer corners of Image 3 transparent
$crop3 = New-Object System.Drawing.Bitmap($img3.Width, $img3.Height)
for ($y = 0; $y -lt $img3.Height; $y++) {
    for ($x = 0; $x -lt $img3.Width; $x++) {
        $c = $img3.GetPixel($x, $y)
        # If outside button
        if (($c.G -gt 170 -and $c.R -gt 140 -and $c.B -gt 150) -or ($c.R -eq 0 -and $c.G -eq 0 -and $c.B -eq 0 -and ($x -lt 5 -or $x -gt 38 -or $y -lt 5 -or $y -gt 38))) {
            $crop3.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $crop3.SetPixel($x, $y, $c)
        }
    }
}
$crop3.Save((Join-Path $assetsDir "topbar-gear-button-exact.png"), [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved topbar-bell-button-exact.png and topbar-gear-button-exact.png"

$crop2.Dispose()
$crop3.Dispose()
$img2.Dispose()
$img3.Dispose()

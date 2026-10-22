Add-Type -AssemblyName System.Drawing

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$refBanner = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341267592.png")

Write-Host "Reference Banner size: $($refBanner.Width) x $($refBanner.Height)"

# Crop the exact rings area from the reference banner!
# Let's see: the rings are from x=840 to 1023 (or whatever width), y=0 to 138
# Let's crop x=850 to 1023, y=0 to 138 with white transparency!
$ringW = 1024 - 850
$ringH = 139
$crop = New-Object System.Drawing.Bitmap($ringW, $ringH)
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.DrawImage($refBanner, (New-Object System.Drawing.Rectangle(0, 0, $ringW, $ringH)), 850, 0, $ringW, $ringH, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Make white pixels transparent
for ($y = 0; $y -lt $crop.Height; $y++) {
    for ($x = 0; $x -lt $crop.Width; $x++) {
        $c = $crop.GetPixel($x, $y)
        # If pure white or almost white (R > 250, G > 250, B > 250), make transparent
        if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
            $crop.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        }
    }
}

$targetPath = "c:\Users\Angel Lae Martinez\Desktop\itsme-fixie1\itsme-fixie\src\assets\banner-rings-from-ref.png"
$crop.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved banner-rings-from-ref.png: $($crop.Width) x $($crop.Height)"

$crop.Dispose()
$refBanner.Dispose()

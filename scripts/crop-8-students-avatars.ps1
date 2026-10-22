Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\2e771f25-d970-4b0b-b267-f958f010720d\.user_uploaded\media_1792252961347.png"
$img = [System.Drawing.Bitmap]::FromFile($filePath)
$outDir = "c:\Users\Angel Lae Martinez\Desktop\itsme-fixie\itsme-fixie\src\assets\avatars"

$avatars = @(
    @{ Name = "angel"; Y = 349 },
    @{ Name = "jennelyn"; Y = 390 },
    @{ Name = "reyn"; Y = 430 },
    @{ Name = "juan"; Y = 470 },
    @{ Name = "maria"; Y = 511 },
    @{ Name = "jeane"; Y = 552 },
    @{ Name = "jazmin"; Y = 592 },
    @{ Name = "emmanuel"; Y = 632 }
)

$size = 28
$xCenter = 385

foreach ($a in $avatars) {
    $rect = New-Object System.Drawing.Rectangle(($xCenter - [int]($size/2)), ($a.Y - [int]($size/2)), $size, $size)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $crop.Save("$outDir\$($a.Name).png", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Host "Extracted $($a.Name).png at Y=$($a.Y)"
}

$img.Dispose()

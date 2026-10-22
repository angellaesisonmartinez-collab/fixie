Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345049348.png")
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

Write-Host "=== Image 1 (Header: $($img1.Width)x$($img1.Height)) ==="
$headerBg = $img1.GetPixel(500, 40)
Write-Host "Header BG: $(ColorToHex $headerBg) R=$($headerBg.R) G=$($headerBg.G) B=$($headerBg.B)"

# Find Bell button in Image 1
$bMinX = 1000; $bMaxX = 0; $bMinY = 1000; $bMaxY = 0
for ($y = 0; $y -lt $img1.Height; $y++) {
    for ($x = 850; $x -lt 970; $x++) {
        $c = $img1.GetPixel($x, $y)
        if ((ColorToHex $c) -eq "#FFFFFF") {
            if ($x -lt $bMinX) { $bMinX = $x }
            if ($x -gt $bMaxX) { $bMaxX = $x }
            if ($y -lt $bMinY) { $bMinY = $y }
            if ($y -gt $bMaxY) { $bMaxY = $y }
        }
    }
}
Write-Host "Image 1 Bell Button: X=$bMinX to $bMaxX (w=$($bMaxX-$bMinX+1)), Y=$bMinY to $bMaxY (h=$($bMaxY-$bMinY+1))"

# Find Gear button in Image 1
$gMinX = 1000; $gMaxX = 0; $gMinY = 1000; $gMaxY = 0
for ($y = 10; $y -lt 75; $y++) {
    for ($x = 940; $x -lt 1020; $x++) {
        $c = $img1.GetPixel($x, $y)
        # dark green
        if ($c.G -lt 50 -and $c.R -lt 25 -and $c.B -lt 30) {
            if ($x -lt $gMinX) { $gMinX = $x }
            if ($x -gt $gMaxX) { $gMaxX = $x }
            if ($y -lt $gMinY) { $gMinY = $y }
            if ($y -gt $gMaxY) { $gMaxY = $y }
        }
    }
}
Write-Host "Image 1 Gear Button: X=$gMinX to $gMaxX (w=$($gMaxX-$gMinX+1)), Y=$gMinY to $gMaxY (h=$($gMaxY-$gMinY+1))"
Write-Host "Gap between buttons: $($gMinX - $bMaxX - 1) px"
Write-Host "Right margin: $($img1.Width - $gMaxX - 1) px"

Write-Host "`n=== Image 2 (Bell Icon 45x45) ==="
# Sample border color on top edge (x=22, y=0)
Write-Host "Bell border color at (22, 0): $(ColorToHex $img2.GetPixel(22, 0))"
# Sample bell icon color at center (x=22, y=20)
Write-Host "Bell icon color at (22, 20): $(ColorToHex $img2.GetPixel(22, 20))"
# Check horizontal line at bottom of bell: y=26..29
Write-Host "Bell clapper color at (22, 30): $(ColorToHex $img2.GetPixel(22, 30))"

Write-Host "`n=== Image 3 (Gear Icon 44x44) ==="
# Sample background color at (5, 5)
Write-Host "Gear BG color at (5, 5): $(ColorToHex $img3.GetPixel(5, 5))"
# Sample gear white color at (22, 14)
Write-Host "Gear teeth white color at (22, 14): $(ColorToHex $img3.GetPixel(22, 14))"
# Sample gear center hole color at (22, 22)
Write-Host "Gear center hole color at (22, 22): $(ColorToHex $img3.GetPixel(22, 22))"

$img1.Dispose()
$img2.Dispose()
$img3.Dispose()

Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341265320.png")

# Settings Button bounds (y from 15 to 70 only)
$sMinX = 1000; $sMaxX = 0; $sMinY = 1000; $sMaxY = 0
for ($y = 15; $y -lt 70; $y++) {
    for ($x = 945; $x -lt 1020; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.G -lt 50 -and $c.R -lt 20 -and $c.B -lt 30) {
            if ($x -lt $sMinX) { $sMinX = $x }
            if ($x -gt $sMaxX) { $sMaxX = $x }
            if ($y -lt $sMinY) { $sMinY = $y }
            if ($y -gt $sMaxY) { $sMaxY = $y }
        }
    }
}
Write-Host "Settings Button bounds: X: $sMinX to $sMaxX (w=$($sMaxX - $sMinX + 1)), Y: $sMinY to $sMaxY (h=$($sMaxY - $sMinY + 1))"

# Check right margin from right edge
Write-Host "Gap between Bell (right=949) and Settings (left=$sMinX): $($sMinX - 949 - 1) px"
Write-Host "Right margin from 1024: $(1024 - $sMaxX - 1) px"

# Settings button color at center:
$centerC = $img2.GetPixel([int](($sMinX+$sMaxX)/2), [int](($sMinY+$sMaxY)/2))
Write-Host "Settings button center (icon): $(ColorToHex $centerC)"

# Settings button bg at corner:
$bgC = $img2.GetPixel($sMinX + 4, $sMinY + 4)
Write-Host "Settings button bg at corner: $(ColorToHex $bgC)"

$img2.Dispose()

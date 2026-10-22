Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341267592.png")

Write-Host "Image 3 size: $($img3.Width) x $($img3.Height)"

# Find all green pixels on the right side (x > 800)
$greenPixels = @()
$minX = 1000; $maxX = 0; $minY = 1000; $maxY = 0

for ($y = 0; $y -lt $img3.Height; $y++) {
    for ($x = 800; $x -lt $img3.Width; $x++) {
        $c = $img3.GetPixel($x, $y)
        # Green ring color: G > 40 and G > R*1.2
        if ($c.G -gt 35 -and $c.G -lt 120 -and $c.R -lt 50 -and $c.B -lt 50) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            $greenPixels += (ColorToHex $c)
        }
    }
}

Write-Host "Rings bounds in Image 3: X: $minX to $maxX (w=$($maxX - $minX + 1)), Y: $minY to $maxY (h=$($maxY - $minY + 1))"
Write-Host "Distance from right edge ($($img3.Width)): $($img3.Width - $maxX - 1) px"
Write-Host "Sample ring green color: $($greenPixels | Select -First 5)"

# Find thickness of the ring: scan horizontally at y = 50 from x = minX
$thickness = 0
for ($x = $minX; $x -lt $minX + 50; $x++) {
    $c = $img3.GetPixel($x, 50)
    if ($c.G -gt 35 -and $c.R -lt 50) {
        $thickness++
    }
}
Write-Host "Ring thickness sample at y=50: $thickness px"

$img3.Dispose()

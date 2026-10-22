Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341265320.png")

Write-Host "Image 2 dimensions: $($img2.Width) x $($img2.Height)"

# Top bar background color at x=500, y=40
$bg = $img2.GetPixel(500, 40)
Write-Host "Top Bar BG: $(ColorToHex $bg) R=$($bg.R) G=$($bg.G) B=$($bg.B)"

# Top bar bottom border at y=$img2.Height - 1
for ($y = $img2.Height - 5; $y -lt $img2.Height; $y++) {
    $c = $img2.GetPixel(500, $y)
    Write-Host "Bottom y=${y} : $(ColorToHex $c)"
}

# Scan buttons from x=880 to 1020, y=10 to 75
# Find Bell button bounds (white background)
$bMinX = 1000; $bMaxX = 0; $bMinY = 1000; $bMaxY = 0
for ($y = 0; $y -lt $img2.Height; $y++) {
    for ($x = 880; $x -lt 960; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ((ColorToHex $c) -eq "#FFFFFF") {
            if ($x -lt $bMinX) { $bMinX = $x }
            if ($x -gt $bMaxX) { $bMaxX = $x }
            if ($y -lt $bMinY) { $bMinY = $y }
            if ($y -gt $bMaxY) { $bMaxY = $y }
        }
    }
}
Write-Host "Bell Button (white) bounds: X: $bMinX to $bMaxX (w=$($bMaxX - $bMinX + 1)), Y: $bMinY to $bMaxY (h=$($bMaxY - $bMinY + 1))"

# Check Bell button border
$borderLeft = $img2.GetPixel($bMinX - 1, [int](($bMinY + $bMaxY) / 2))
Write-Host "Bell button border color: $(ColorToHex $borderLeft)"

# Check Bell icon inside button
$iconDark = @()
for ($y = $bMinY; $y -le $bMaxY; $y++) {
    for ($x = $bMinX; $x -le $bMaxX; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.G -lt 80 -and $c.R -lt 50) {
            $iconDark += (ColorToHex $c)
        }
    }
}
Write-Host "Bell icon dark pixels count = $($iconDark.Count), sample: $($iconDark | Select -First 1)"

# Find Settings button bounds (dark green #062512)
$sMinX = 1000; $sMaxX = 0; $sMinY = 1000; $sMaxY = 0
for ($y = 0; $y -lt $img2.Height; $y++) {
    for ($x = 945; $x -lt 1020; $x++) {
        $c = $img2.GetPixel($x, $y)
        # dark green bg
        if ($c.G -lt 50 -and $c.R -lt 20 -and $c.B -lt 30) {
            if ($x -lt $sMinX) { $sMinX = $x }
            if ($x -gt $sMaxX) { $sMaxX = $x }
            if ($y -lt $sMinY) { $sMinY = $y }
            if ($y -gt $sMaxY) { $sMaxY = $y }
        }
    }
}
Write-Host "Settings Button (dark green) bounds: X: $sMinX to $sMaxX (w=$($sMaxX - $sMinX + 1)), Y: $sMinY to $sMaxY (h=$($sMaxY - $sMinY + 1))"

# Gap between Bell button and Settings button:
Write-Host "Gap between Bell and Settings: $($sMinX - $bMaxX - 1) px"
Write-Host "Right margin from screen edge (1024): $(1024 - $sMaxX - 1) px"

$img2.Dispose()

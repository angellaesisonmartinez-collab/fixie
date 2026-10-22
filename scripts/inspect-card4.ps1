Add-Type -AssemblyName System.Drawing

function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img4 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341269298.png")

Write-Host "Card 1 in Image 4 analysis:"
# Find Card 1 exact bounding box
# Let's inspect x from 0 to 260, y from 0 to 158
$minX = 1000; $maxX = 0; $minY = 1000; $maxY = 0
for ($y = 0; $y -lt $img4.Height; $y++) {
    for ($x = 0; $x -lt 250; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ((ColorToHex $c) -eq "#FFFFFF") {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host "Card 1 white bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"
Write-Host "Card 1 width = $($maxX - $minX + 1), height = $($maxY - $minY + 1)"

# Check Card 1 outer border at x=minX-1 or x=minX
Write-Host "Card 1 border color at ($($minX), 50): $(ColorToHex $img4.GetPixel($minX, 50))"
Write-Host "Card 1 border color at ($($minX-1), 50): $(ColorToHex $img4.GetPixel($minX-1, 50))"

# Check label "TOTAL STUDENTS" position and font color
Write-Host "Scanning label text in Card 1..."
for ($y = 15; $y -lt 45; $y++) {
    for ($x = 20; $x -lt 160; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            Write-Host "Label pixel at (${x},${y}): $(ColorToHex $c)"
            break
        }
    }
    if ($x -lt 160) { break }
}

# Check icon badge in Card 1 (top right: x ~ 180..230, y ~ 10..55)
Write-Host "Scanning icon badge in Card 1..."
for ($x = 180; $x -lt 235; $x++) {
    $c = $img4.GetPixel($x, 30)
    if ($c.G -gt 150 -and $c.R -gt 120 -and $c.B -gt 120) {
        Write-Host "Badge bg at (${x}, 30): $(ColorToHex $c)"
    }
}

# Find badge bounds
$bMinX = 1000; $bMaxX = 0; $bMinY = 1000; $bMaxY = 0
for ($y = 10; $y -lt 60; $y++) {
    for ($x = 170; $x -lt 240; $x++) {
        $c = $img4.GetPixel($x, $y)
        # badge color is sage green ~ #9CC6A8 or #A8CEB3 or #B1D3B9
        if ($c.G -gt 160 -and $c.R -gt 130 -and $c.R -lt 190 -and $c.B -gt 140) {
            if ($x -lt $bMinX) { $bMinX = $x }
            if ($x -gt $bMaxX) { $bMaxX = $x }
            if ($y -lt $bMinY) { $bMinY = $y }
            if ($y -gt $bMaxY) { $bMaxY = $y }
        }
    }
}
Write-Host "Badge bounds: X: $bMinX to $bMaxX (w=$($bMaxX-$bMinX+1)), Y: $bMinY to $bMaxY (h=$($bMaxY-$bMinY+1))"

# Check icon inside badge
for ($y = $bMinY; $y -le $bMaxY; $y++) {
    for ($x = $bMinX; $x -le $bMaxX; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 60 -and $c.B -lt 50) {
            Write-Host "Icon pixel at (${x},${y}): $(ColorToHex $c)"
            break
        }
    }
    if ($x -le $bMaxX) { break }
}

# Check number "12" in Card 1 (y ~ 50..120)
$nMinY = 1000; $nMaxY = 0
for ($y = 50; $y -lt 120; $y++) {
    for ($x = 20; $x -lt 100; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
            if ($y -lt $nMinY) { $nMinY = $y }
            if ($y -gt $nMaxY) { $nMaxY = $y }
        }
    }
}
Write-Host "Number 12 Y bounds: $nMinY to $nMaxY (height = $($nMaxY - $nMinY + 1))"

# Check divider line between number and subtext (y ~ 110..130)
Write-Host "Checking divider line..."
for ($y = $nMaxY; $y -lt 140; $y++) {
    # Scan horizontally across card (x = 25 to 220)
    $linePixels = 0
    $sampleColor = ""
    for ($x = 25; $x -lt 220; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ((ColorToHex $c) -ne "#FFFFFF") {
            $linePixels++
            $sampleColor = ColorToHex $c
        }
    }
    if ($linePixels -gt 50) {
        Write-Host "Horizontal divider line at y=$y with $linePixels non-white pixels, sample color: $sampleColor"
        # Find start and end of this divider line
        $lStart = 0; $lEnd = 0
        for ($x = 0; $x -lt 250; $x++) {
            if ((ColorToHex $img4.GetPixel($x, $y)) -ne "#FFFFFF") { $lStart = $x; break }
        }
        for ($x = 249; $x -ge 0; $x--) {
            if ((ColorToHex $img4.GetPixel($x, $y)) -ne "#FFFFFF") { $lEnd = $x; break }
        }
        Write-Host "Divider line x bounds: $lStart to $lEnd (width = $($lEnd - $lStart + 1))"
    }
}

# Check Card 4 (RESOLVED) border
Write-Host "`nChecking Card 4 (RESOLVED) border..."
# Card 4 is roughly x ~ 760..1023
for ($x = 760; $x -lt 780; $x++) {
    $c = $img4.GetPixel($x, 70)
    if ($c.G -gt 80 -and $c.G -lt 150 -and $c.R -lt 60) {
        Write-Host "Card 4 green border at x=$x : $(ColorToHex $c)"
    }
}

$img4.Dispose()

Add-Type -AssemblyName System.Drawing

function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

# ========================================================
# 1. ANALYZE IMAGE 1 (FULL SCREEN: 1024 x 728)
# ========================================================
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341261992.png")
Write-Host "=== 1. FULL SCREEN (1024x728) MEASUREMENTS ==="
# Find sidebar width: scan horizontally at y=300
$sideW = 0
for ($x = 0; $x -lt 400; $x++) {
    $c = $img1.GetPixel($x, 300)
    # Sidebar bg is around #DBE9E0 or similar. Content bg is different.
    $nextC = $img1.GetPixel($x + 1, 300)
    # Check vertical divider line
    if ($c.R -ne $nextC.R -or $c.G -ne $nextC.G -or $c.B -ne $nextC.B) {
        # Check if boundary
        $cLeft = $img1.GetPixel([Math]::Max(0, $x - 5), 300)
        $cRight = $img1.GetPixel([Math]::Min(1023, $x + 10), 300)
        if ((ColorToHex $cLeft) -ne (ColorToHex $cRight)) {
            $sideW = $x
            Write-Host "Sidebar boundary at x=$x (Left=$(ColorToHex $cLeft), Line=$(ColorToHex $c), Right=$(ColorToHex $cRight))"
            break
        }
    }
}

# Find Top Bar height in Image 1: scan vertically at x=500
$topH = 0
for ($y = 0; $y -lt 150; $y++) {
    $c = $img1.GetPixel(500, $y)
    $cNext = $img1.GetPixel(500, $y + 1)
    if ((ColorToHex $c) -ne (ColorToHex $cNext)) {
        Write-Host "Top Bar boundary in Full Screen at y=${y} : $(ColorToHex $c) -> $(ColorToHex $cNext)"
        $topH = $y
        break
    }
}

# Scan content area background color in Image 1 (at x=500, y=100)
$cContent = $img1.GetPixel(500, 100)
Write-Host "Content area background (below Top Bar): $(ColorToHex $cContent)"

# Check banner position in Image 1
for ($y = $topH + 1; $y -lt 300; $y++) {
    $c = $img1.GetPixel(300, $y)
    if ((ColorToHex $c) -eq "#FFFFFF") {
        Write-Host "Banner starts at y=${y} in Full Screen"
        break
    }
}
$img1.Dispose()

# ========================================================
# 2. ANALYZE IMAGE 2 (TOP BAR: 1024 x 85)
# ========================================================
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341265320.png")
Write-Host "`n=== 2. TOP BAR (1024x85) ==="
# Find buttons: scan x from 800 to 1023 at y=42
for ($x = 800; $x -lt 1024; $x++) {
    $c = $img2.GetPixel($x, 42)
    if ((ColorToHex $c) -eq "#FFFFFF" -or $c.G -lt 60) {
        Write-Host "Button activity at x=${x} : $(ColorToHex $c)"
    }
}
$img2.Dispose()

# ========================================================
# 3. ANALYZE IMAGE 3 (BANNER: 1024 x 139)
# ========================================================
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341267592.png")
Write-Host "`n=== 3. BANNER (1024x139) ==="
# Check where white card starts and ends
$cardLeft = -1; $cardRight = -1; $cardTop = -1; $cardBottom = -1
for ($x = 0; $x -lt 100; $x++) {
    if ((ColorToHex $img3.GetPixel($x, 70)) -eq "#FFFFFF") { $cardLeft = $x; break }
}
for ($x = 1023; $x -gt 900; $x--) {
    if ((ColorToHex $img3.GetPixel($x, 70)) -eq "#FFFFFF") { $cardRight = $x; break }
}
for ($y = 0; $y -lt 50; $y++) {
    if ((ColorToHex $img3.GetPixel(100, $y)) -eq "#FFFFFF") { $cardTop = $y; break }
}
for ($y = 138; $y -gt 90; $y--) {
    if ((ColorToHex $img3.GetPixel(100, $y)) -eq "#FFFFFF") { $cardBottom = $y; break }
}
Write-Host "Banner card bounds: Left=${cardLeft}, Right=${cardRight}, Top=${cardTop}, Bottom=${cardBottom}. Card size = $($cardRight-$cardLeft) x $($cardBottom-$cardTop)"

# Sample title color
for ($y = 20; $y -lt 70; $y++) {
    for ($x = 20; $x -lt 80; $x++) {
        $c = $img3.GetPixel($x, $y)
        if ($c.R -lt 40 -and $c.G -lt 60 -and $c.B -lt 40 -and (ColorToHex $c) -ne "#000000") {
            Write-Host "Title sample: $(ColorToHex $c) at (${x},${y})"
            break
        }
    }
    if ($x -lt 80) { break }
}
$img3.Dispose()

# ========================================================
# 4. ANALYZE IMAGE 4 (STAT CARDS: 1024 x 159)
# ========================================================
$img4 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341269298.png")
Write-Host "`n=== 4. STAT CARDS (1024x159) ==="
# Find card boundaries
Write-Host "Scanning horizontal card boundaries at y=80..."
$inCard = $false
for ($x = 0; $x -lt 1024; $x++) {
    $c = $img4.GetPixel($x, 80)
    $isWhite = ((ColorToHex $c) -eq "#FFFFFF")
    if ($isWhite -and -not $inCard) {
        $inCard = $true
        $cardStartX = $x
        Write-Host "Card start at x=${x}"
    } elseif (-not $isWhite -and $inCard) {
        $inCard = $false
        Write-Host "Card end at x=$($x-1) (Width=$($x - $cardStartX))"
    }
}

# Check divider line in Card 1 (x between 10 and 240)
# Look vertically between number (y ~ 50..100) and label/footer (y ~ 110..150)
Write-Host "Scanning for divider line in Card 1..."
for ($y = 80; $y -lt 140; $y++) {
    $c = $img4.GetPixel(50, $y)
    if ((ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Divider/Element found at y=${y} : $(ColorToHex $c)"
    }
}
$img4.Dispose()

# ========================================================
# 5. ANALYZE IMAGE 5 (RECENT REPORTS: 1024 x 474)
# ========================================================
$img5 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341271257.png")
Write-Host "`n=== 5. RECENT REPORTS (1024x474) ==="
# Header bar y position
for ($y = 50; $y -lt 150; $y++) {
    $c = $img5.GetPixel(100, $y)
    if ((ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Table header start at y=$y : $(ColorToHex $c)"
        # Find end of header
        for ($y2 = $y + 1; $y2 -lt $y + 60; $y2++) {
            $c2 = $img5.GetPixel(100, $y2)
            if ((ColorToHex $c2) -eq "#FFFFFF") {
                Write-Host "Table header end at y2=$y2 (Height = $($y2-$y))"
                break
            }
        }
        break
    }
}

# Check footer banner
for ($y = 473; $y -gt 350; $y--) {
    $c = $img5.GetPixel(100, $y)
    if ((ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Table footer at y=$y : $(ColorToHex $c)"
    }
}
$img5.Dispose()

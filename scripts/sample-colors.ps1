Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$userDir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\6909d2b7-fa55-4659-bf2c-e2f851efa217\.user_uploaded"
$img2 = [System.Drawing.Bitmap]::FromFile("$userDir\media_1792338003681.png")
$img3 = [System.Drawing.Bitmap]::FromFile("$userDir\media_1792338005459.png")

Write-Host "=== 1. Stat Card Icon Badges in Image 2 ==="
# In card 1, the badge is on top right (approx x=200..230, y=200..240)
for ($y = 200; $y -lt 250; $y++) {
    for ($x = 180; $x -lt 230; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.G -gt 150 -and $c.R -gt 120 -and $c.R -lt 180 -and $c.B -gt 130) {
            Write-Host "Card 1 Badge bg sample: $(ColorToHex $c) at ($x,$y)"
            # Icon inside badge
            $iconC = $img2.GetPixel($x + 10, $y + 10)
            Write-Host "Card 1 Badge icon sample: $(ColorToHex $iconC)"
            break
        }
    }
    if ($x -lt 230) { break }
}

Write-Host "`n=== 2. Table Header Bar in Image 2 ==="
# Table header row is between y=510 and 540 in Image 2
for ($y = 500; $y -lt 550; $y++) {
    $c = $img2.GetPixel(100, $y)
    if ($c.G -gt 210 -and $c.R -gt 200 -and $c.B -gt 200 -and (ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Table Header bar bg: $(ColorToHex $c) at (100,$y)"
        break
    }
}

Write-Host "`n=== 3. ID Badge in Row 1 in Image 2 ==="
for ($y = 570; $y -lt 630; $y++) {
    $c = $img2.GetPixel(55, $y)
    if ($c.G -lt 80 -and $c.R -lt 50) {
        Write-Host "ID Badge dark green bg: $(ColorToHex $c) at (55,$y)"
        break
    }
}

Write-Host "`n=== 4. Status Pills in Image 2 ==="
# Status pill column is around x=800..850
# Row 1 (UNDER REVIEW)
for ($y = 580; $y -lt 620; $y++) {
    $c = $img2.GetPixel(810, $y)
    if ($c.R -gt 230 -and $c.G -gt 230 -and $c.B -lt 210) {
        Write-Host "UNDER REVIEW pill bg: $(ColorToHex $c) at (810,$y)"
        # text color inside
        for ($tx = 770; $tx -lt 850; $tx++) {
            $tc = $img2.GetPixel($tx, $y)
            if ($tc.R -lt 150 -and $tc.G -lt 150 -and $tc.B -lt 100) {
                Write-Host "UNDER REVIEW text color: $(ColorToHex $tc) at ($tx,$y)"
                break
            }
        }
        break
    }
}

# Row 3 (UNDER REPAIR)
for ($y = 730; $y -lt 770; $y++) {
    $c = $img2.GetPixel(810, $y)
    if ($c.B -gt 230 -and $c.R -gt 200 -and $c.G -gt 220) {
        Write-Host "UNDER REPAIR pill bg: $(ColorToHex $c) at (810,$y)"
        for ($tx = 770; $tx -lt 850; $tx++) {
            $tc = $img2.GetPixel($tx, $y)
            if ($tc.R -lt 100 -and $tc.G -lt 150 -and $tc.B -lt 180) {
                Write-Host "UNDER REPAIR text color: $(ColorToHex $tc) at ($tx,$y)"
                break
            }
        }
        break
    }
}

# Row 4 (RESOLVED)
for ($y = 800; $y -lt 850; $y++) {
    if ($y -ge $img2.Height) { break }
    $c = $img2.GetPixel(810, $y)
    if ($c.G -gt 230 -and $c.R -gt 200 -and $c.B -gt 200) {
        Write-Host "RESOLVED pill bg: $(ColorToHex $c) at (810,$y)"
        for ($tx = 770; $tx -lt 850; $tx++) {
            $tc = $img2.GetPixel($tx, $y)
            if ($tc.G -lt 160 -and $tc.R -lt 80 -and $tc.B -lt 80) {
                Write-Host "RESOLVED text color: $(ColorToHex $tc) at ($tx,$y)"
                break
            }
        }
        break
    }
}

Write-Host "`n=== 5. View Button in Row 1 in Image 2 ==="
# View button is around x=930..960
for ($y = 580; $y -lt 620; $y++) {
    $c = $img2.GetPixel(940, $y)
    if ($c.G -lt 60 -and $c.R -lt 40) {
        Write-Host "View button bg: $(ColorToHex $c) at (940,$y)"
        break
    }
}

Write-Host "`n=== 6. Table Footer in Image 2 ==="
# Around bottom of image
for ($y = $img2.Height - 1; $y -gt ($img2.Height - 60); $y--) {
    $c = $img2.GetPixel(100, $y)
    if ($c.G -gt 210 -and $c.R -gt 200 -and $c.B -gt 200 -and (ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Table Footer bar bg: $(ColorToHex $c) at (100,$y)"
        break
    }
}

$img2.Dispose()
$img3.Dispose()

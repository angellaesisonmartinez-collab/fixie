Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img5 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341271257.png")

Write-Host "Image 5 size: $($img5.Width) x $($img5.Height)"

# 1. Header Row in Image 5:
# Scan y from 40 to 120 at x=500
$thTop = 0; $thBottom = 0
for ($y = 40; $y -lt 120; $y++) {
    $c = $img5.GetPixel(500, $y)
    # Check if header bg (~#DBE9E0)
    if ($c.G -gt 220 -and $c.R -gt 200 -and $c.B -gt 210) {
        if ($thTop -eq 0) { $thTop = $y }
    } elseif ($thTop -ne 0 -and $thBottom -eq 0) {
        $thBottom = $y - 1
        break
    }
}
Write-Host "Table Header Row: y=$thTop to $thBottom (height = $($thBottom - $thTop + 1) px)"
Write-Host "Table Header BG at (500, $thTop + 5): $(ColorToHex $img5.GetPixel(500, $thTop + 5))"

# 2. Measure Rows 1 to 5:
# Find start of each data row by scanning ID badges (dark green #234F20 or similar at x=50..70)
$rowBadges = @()
for ($y = $thBottom + 1; $y -lt $img5.Height - 40; $y++) {
    $c = $img5.GetPixel(55, $y)
    # Dark green ID badge: R < 50, G < 90, G > R
    if ($c.G -gt 50 -and $c.G -lt 100 -and $c.R -lt 50) {
        $rowBadges += $y
    }
}
Write-Host "Found $($rowBadges.Count) ID badge pixel rows between y=$($thBottom+1) and $($img5.Height-40)"

# Let's inspect Row 1 (LR-24):
# Find top and bottom of LR-24 badge
$b1Top = 0; $b1Bottom = 0; $b1Left = 0; $b1Right = 0
for ($y = $thBottom + 1; $y -lt $thBottom + 80; $y++) {
    for ($x = 30; $x -lt 100; $x++) {
        $c = $img5.GetPixel($x, $y)
        if ($c.G -gt 50 -and $c.G -lt 95 -and $c.R -lt 45) {
            if ($b1Top -eq 0) { $b1Top = $y }
            $b1Bottom = $y
            if ($b1Left -eq 0 -or $x -lt $b1Left) { $b1Left = $x }
            if ($x -gt $b1Right) { $b1Right = $x }
        }
    }
}
Write-Host "ID Badge LR-24 bounds: X: $b1Left to $b1Right (w=$($b1Right-$b1Left+1)), Y: $b1Top to $b1Bottom (h=$($b1Bottom-$b1Top+1))"
Write-Host "ID Badge BG sample: $(ColorToHex $img5.GetPixel($b1Left+4, $b1Top+4))"

# Check Row 1 total height (divider line between Row 1 and Row 2)
# Scan y from $b1Bottom to $b1Bottom + 40 for row divider line
for ($y = $b1Bottom; $y -lt $b1Bottom + 50; $y++) {
    $c = $img5.GetPixel(200, $y)
    if ((ColorToHex $c) -ne "#FFFFFF") {
        Write-Host "Row 1 bottom divider line at y=$y : $(ColorToHex $c) (Row 1 height from thBottom: $($y - $thBottom) px)"
        break
    }
}

# 3. Avatar in Row 1:
# Avatar is around x=230..280, y=$b1Top..$b1Bottom
for ($x = 220; $x -lt 300; $x++) {
    $c = $img5.GetPixel($x, [int](($b1Top+$b1Bottom)/2))
    # look for circle border
}

# 4. View button in Row 1:
# Around x=900..980
$vLeft = 0; $vRight = 0; $vTop = 0; $vBottom = 0
for ($y = $thBottom + 5; $y -lt $thBottom + 65; $y++) {
    for ($x = 880; $x -lt 980; $x++) {
        $c = $img5.GetPixel($x, $y)
        # dark green View button
        if ($c.G -lt 50 -and $c.R -lt 20 -and $c.B -lt 30) {
            if ($vTop -eq 0) { $vTop = $y }
            $vBottom = $y
            if ($vLeft -eq 0 -or $x -lt $vLeft) { $vLeft = $x }
            if ($x -gt $vRight) { $vRight = $x }
        }
    }
}
Write-Host "View Button Row 1 bounds: X: $vLeft to $vRight (w=$($vRight-$vLeft+1)), Y: $vTop to $vBottom (h=$($vBottom-$vTop+1))"
Write-Host "View Button BG: $(ColorToHex $img5.GetPixel($vLeft+3, $vTop+3))"

# 5. Status Pill in Row 1 (UNDER REVIEW):
$pLeft = 0; $pRight = 0; $pTop = 0; $pBottom = 0
for ($y = $thBottom + 5; $y -lt $thBottom + 65; $y++) {
    for ($x = 750; $x -lt 870; $x++) {
        $c = $img5.GetPixel($x, $y)
        # pale yellow bg: R > 230, G > 220, B < 210
        if ($c.R -gt 230 -and $c.G -gt 220 -and $c.B -lt 210) {
            if ($pTop -eq 0) { $pTop = $y }
            $pBottom = $y
            if ($pLeft -eq 0 -or $x -lt $pLeft) { $pLeft = $x }
            if ($x -gt $pRight) { $pRight = $x }
        }
    }
}
Write-Host "UNDER REVIEW Pill bounds: X: $pLeft to $pRight (w=$($pRight-$pLeft+1)), Y: $pTop to $pBottom (h=$($pBottom-$pTop+1))"
Write-Host "UNDER REVIEW BG: $(ColorToHex $img5.GetPixel($pLeft+5, $pTop+5))"

# 6. Table Footer Bar:
# Scan bottom of Image 5
$tfTop = 0; $tfBottom = 0
for ($y = $img5.Height - 60; $y -lt $img5.Height; $y++) {
    $c = $img5.GetPixel(500, $y)
    if ($c.G -gt 220 -and $c.R -gt 200 -and $c.B -gt 210) {
        if ($tfTop -eq 0) { $tfTop = $y }
        $tfBottom = $y
    }
}
Write-Host "Table Footer Row: y=$tfTop to $tfBottom (height = $($tfBottom - $tfTop + 1) px)"
Write-Host "Table Footer BG: $(ColorToHex $img5.GetPixel(500, $tfTop + 5))"

$img5.Dispose()

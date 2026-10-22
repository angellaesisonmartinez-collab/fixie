Add-Type -AssemblyName System.Drawing

function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$userDir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\6909d2b7-fa55-4659-bf2c-e2f851efa217\.user_uploaded"
$img2 = [System.Drawing.Bitmap]::FromFile("$userDir\media_1792338003681.png")

Write-Host "=== Image 2 Analysis ==="
Write-Host "Dimensions: $($img2.Width) x $($img2.Height)"

# Let's inspect rows from top
# Card 1: Hero Card
# Find top border of Hero card
$card1Top = 0; $card1Bottom = 0; $card1Left = 0; $card1Right = 0
for ($y = 0; $y -lt 100; $y++) {
    for ($x = 0; $x -lt 100; $x++) {
        $c = $img2.GetPixel($x, $y)
        # Check if border or white
        if ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
            # found white inside
        }
    }
}

# Let's find Hero Card bounds in Image 2
# Check column 20 for card boundary
for ($y = 0; $y -lt 300; $y++) {
    $c = $img2.GetPixel(50, $y)
    if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
        if ($card1Top -eq 0) { $card1Top = $y }
    } elseif ($card1Top -ne 0 -and $card1Bottom -eq 0) {
        $card1Bottom = $y - 1
    }
}

for ($x = 0; $x -lt 500; $x++) {
    $c = $img2.GetPixel($x, [int](($card1Top + $card1Bottom)/2))
    if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
        $card1Left = $x
        break
    }
}
for ($x = 1023; $x -ge 500; $x--) {
    $c = $img2.GetPixel($x, [int](($card1Top + $card1Bottom)/2))
    if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
        $card1Right = $x
        break
    }
}

Write-Host "Hero Card Bounds in Image 2: X: $card1Left to $card1Right (Width: $($card1Right - $card1Left + 1)), Y: $card1Top to $card1Bottom (Height: $($card1Bottom - $card1Top + 1))"

# Card 2: Stat Cards
$statTop = 0; $statBottom = 0
for ($y = $card1Bottom + 1; $y -lt 500; $y++) {
    $c = $img2.GetPixel(50, $y)
    if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
        if ($statTop -eq 0) { $statTop = $y }
    } elseif ($statTop -ne 0 -and $statBottom -eq 0) {
        $statBottom = $y - 1
        break
    }
}
Write-Host "Stat Cards Y in Image 2: $statTop to $statBottom (Height: $($statBottom - $statTop + 1))"
Write-Host "Gap between Hero and Stat cards: $($statTop - $card1Bottom - 1) px"

# Find 4 stat cards X boundaries at y = ($statTop + 20)
$cardMidY = [int](($statTop + $statBottom) / 2)
Write-Host "Scanning stat cards along y=$cardMidY"
$inCard = $false
$cardIdx = 1
for ($x = 0; $x -lt 1024; $x++) {
    $c = $img2.GetPixel($x, $cardMidY)
    $isCard = ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250)
    if ($isCard -and -not $inCard) {
        $inCard = $true
        $startX = $x
    } elseif (-not $isCard -and $inCard) {
        $inCard = $false
        $endX = $x - 1
        Write-Host "Stat Card $($cardIdx): X: $startX to $endX (Width: $($endX - $startX + 1))"
        $cardIdx++
    }
}
if ($inCard) {
    Write-Host "Stat Card $($cardIdx): X: $startX to 1023 (Width: $(1024 - $startX))"
}

# Card 3: Recent Reports
$repTop = 0; $repBottom = 0
for ($y = $statBottom + 1; $y -lt 804; $y++) {
    $c = $img2.GetPixel(50, $y)
    if ($c.R -gt 250 -and $c.G -gt 250 -and $c.B -gt 250) {
        if ($repTop -eq 0) { $repTop = $y }
    } elseif ($repTop -ne 0 -and $repBottom -eq 0) {
        $repBottom = $y - 1
    }
}
Write-Host "Recent Reports Card Y in Image 2: $repTop to $repBottom (Height: $($repBottom - $repTop + 1))"
Write-Host "Gap between Stat cards and Recent Reports: $($repTop - $statBottom - 1) px"

$img2.Dispose()

Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341261992.png")

# Find banner in Image 1:
# Banner is around y=120. Find minX and maxX
$bMinX = 1000; $bMaxX = 0
for ($x = 211; $x -lt 1024; $x++) {
    $c = $img1.GetPixel($x, 120)
    if ((ColorToHex $c) -eq "#FFFFFF") {
        if ($x -lt $bMinX) { $bMinX = $x }
        if ($x -gt $bMaxX) { $bMaxX = $x }
    }
}
Write-Host "Banner in Full Screen: left=$bMinX, right=$bMaxX (w=$($bMaxX-$bMinX+1))"
Write-Host "Left margin from sidebar (211): $($bMinX - 211) px"
Write-Host "Right margin from screen (1024): $(1024 - $bMaxX - 1) px"

# Find banner top and bottom
$bMinY = 1000; $bMaxY = 0
for ($y = 65; $y -lt 300; $y++) {
    $c = $img1.GetPixel(400, $y)
    if ((ColorToHex $c) -eq "#FFFFFF") {
        if ($y -lt $bMinY) { $bMinY = $y }
        if ($y -gt $bMaxY) { $bMaxY = $y }
    }
}
Write-Host "Banner in Full Screen: top=$bMinY, bottom=$bMaxY (h=$($bMaxY-$bMinY+1))"
Write-Host "Top margin from top bar bottom (64): $($bMinY - 64) px"

# Find stat cards Y in Image 1:
$cMinY = 1000; $cMaxY = 0
for ($y = $bMaxY; $y -lt 400; $y++) {
    $c = $img1.GetPixel(400, $y)
    if ((ColorToHex $c) -eq "#FFFFFF") {
        if ($y -lt $cMinY) { $cMinY = $y }
        if ($y -gt $cMaxY) { $cMaxY = $y }
    }
}
Write-Host "Gap between banner bottom and cards top: $($cMinY - $bMaxY - 1) px"
Write-Host "Cards in Full Screen: top=$cMinY, bottom=$cMaxY (h=$($cMaxY-$cMinY+1))"

# Find reports table Y in Image 1:
$rMinY = 1000; $rMaxY = 0
for ($y = $cMaxY; $y -lt 728; $y++) {
    $c = $img1.GetPixel(400, $y)
    if ((ColorToHex $c) -eq "#FFFFFF") {
        if ($y -lt $rMinY) { $rMinY = $y }
        if ($y -gt $rMaxY) { $rMaxY = $y }
    }
}
Write-Host "Gap between cards bottom and reports top: $($rMinY - $cMaxY - 1) px"
Write-Host "Reports in Full Screen: top=$rMinY"

$img1.Dispose()

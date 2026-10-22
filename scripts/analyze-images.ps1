Add-Type -AssemblyName System.Drawing

function ColorToHex($c) {
    return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
}

$userDir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\6909d2b7-fa55-4659-bf2c-e2f851efa217\.user_uploaded"

$img1 = [System.Drawing.Bitmap]::FromFile("$userDir\media_1792337978908.png")
$img3 = [System.Drawing.Bitmap]::FromFile("$userDir\media_1792338005459.png")

Write-Host "=== TopBar in Image 3 (Full Screen) ==="
# Find bounding boxes of non-bg pixels in top-bar (x from 850 to 1024, y from 0 to 64)
# Let's see the two buttons
$bg = [System.Drawing.ColorTranslator]::FromHtml("#DBE9E0")

# Let's inspect rows and columns around buttons in img3
$minX = 1024; $maxX = 0; $minY = 64; $maxY = 0;
for ($y = 0; $y -lt 64; $y++) {
    for ($x = 850; $x -lt 1024; $x++) {
        $c = $img3.GetPixel($x, $y)
        # Check distance from bg
        $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
        if ($d -gt 30) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host "Buttons cluster bounds in Image 3: X: $minX to $maxX, Y: $minY to $maxY (Height: $($maxY - $minY + 1))"

# Let's separate the two buttons:
# Button 1 is the Bell button (it has white background)
$b1MinX = 1000; $b1MaxX = 0; $b1MinY = 64; $b1MaxY = 0
for ($y = $minY; $y -le $maxY; $y++) {
    for ($x = $minX; $x -lt ($minX + 50); $x++) {
        $c = $img3.GetPixel($x, $y)
        $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
        if ($d -gt 30) {
            if ($x -lt $b1MinX) { $b1MinX = $x }
            if ($x -gt $b1MaxX) { $b1MaxX = $x }
            if ($y -lt $b1MinY) { $b1MinY = $y }
            if ($y -gt $b1MaxY) { $b1MaxY = $y }
        }
    }
}
Write-Host "Button 1 (Bell) in Image 3: X: $b1MinX to $b1MaxX (Width: $($b1MaxX - $b1MinX + 1)), Y: $b1MinY to $b1MaxY (Height: $($b1MaxY - $b1MinY + 1))"
Write-Host "Button 1 center color: $(ColorToHex $img3.GetPixel([int](($b1MinX + $b1MaxX)/2), [int](($b1MinY + $b1MaxY)/2)))"
Write-Host "Button 1 corner pixel: $(ColorToHex $img3.GetPixel($b1MinX + 2, $b1MinY + 2))"

# Button 2 (Gear)
$b2MinX = 1024; $b2MaxX = 0; $b2MinY = 64; $b2MaxY = 0
for ($y = $minY; $y -le $maxY; $y++) {
    for ($x = ($b1MaxX + 1); $x -le $maxX; $x++) {
        $c = $img3.GetPixel($x, $y)
        $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
        if ($d -gt 30) {
            if ($x -lt $b2MinX) { $b2MinX = $x }
            if ($x -gt $b2MaxX) { $b2MaxX = $x }
            if ($y -lt $b2MinY) { $b2MinY = $y }
            if ($y -gt $b2MaxY) { $b2MaxY = $y }
        }
    }
}
Write-Host "Button 2 (Gear) in Image 3: X: $b2MinX to $b2MaxX (Width: $($b2MaxX - $b2MinX + 1)), Y: $b2MinY to $b2MaxY (Height: $($b2MaxY - $b2MinY + 1))"
Write-Host "Button 2 center color: $(ColorToHex $img3.GetPixel([int](($b2MinX + $b2MaxX)/2), [int](($b2MinY + $b2MaxY)/2)))"
Write-Host "Button 2 corner pixel: $(ColorToHex $img3.GetPixel($b2MinX + 2, $b2MinY + 2))"

Write-Host "Gap between buttons: $($b2MinX - $b1MaxX - 1) px"
Write-Host "Right margin from edge (1024 - b2MaxX): $(1024 - $b2MaxX) px"
Write-Host "Top margin (b1MinY): $b1MinY px"

# Also inspect Image 1 (topbar slice) directly
Write-Host "`n=== Image 1 (topbar slice) Details ==="
# Find buttons in Image 1
$minX1 = 320; $maxX1 = 0; $minY1 = 25; $maxY1 = 0;
for ($y = 0; $y -lt $img1.Height; $y++) {
    for ($x = 0; $x -lt $img1.Width; $x++) {
        $c = $img1.GetPixel($x, $y)
        $d = [Math]::Abs($c.R - $bg.R) + [Math]::Abs($c.G - $bg.G) + [Math]::Abs($c.B - $bg.B)
        if ($d -gt 30) {
            if ($x -lt $minX1) { $minX1 = $x }
            if ($x -gt $maxX1) { $maxX1 = $x }
            if ($y -lt $minY1) { $minY1 = $y }
            if ($y -gt $maxY1) { $maxY1 = $y }
        }
    }
}
Write-Host "Image 1 buttons bounds: X: $minX1 to $maxX1, Y: $minY1 to $maxY1"
Write-Host "Image 1 right margin: $($img1.Width - $maxX1) px"

$img1.Dispose()
$img3.Dispose()

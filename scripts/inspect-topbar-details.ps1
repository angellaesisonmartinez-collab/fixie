Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345049348.png")
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

Write-Host "=== Image 1: Top Bar ==="
Write-Host "Size: $($img1.Width) x $($img1.Height)"
$bg = $img1.GetPixel(100, [int]($img1.Height / 2))
Write-Host "Top Bar Background: $(ColorToHex $bg) R=$($bg.R) G=$($bg.G) B=$($bg.B)"

# Scan right side of Image 1 to find the two buttons
$bellFound = $false
$gearFound = $false
# Look across row y = Height / 2 from right to left
$midY = [int]($img1.Height / 2)
for ($x = $img1.Width - 1; $x -ge 0; $x--) {
    $c = $img1.GetPixel($x, $midY)
    # Gear is dark green (#062512 or similar)
    # Bell is white button (#FFFFFF)
}

# Let's inspect Image 2 (Bell Icon close-up)
Write-Host "`n=== Image 2: Bell Icon ==="
Write-Host "Size: $($img2.Width) x $($img2.Height)"
# Sample colors
$bellBg = $img2.GetPixel(10, 10)
Write-Host "Bell button background: $(ColorToHex $bellBg)"
# Find darkest pixel inside bell
$darkest = 9999
$bellColor = $null
for ($y = 0; $y -lt $img2.Height; $y++) {
    for ($x = 0; $x -lt $img2.Width; $x++) {
        $c = $img2.GetPixel($x, $y)
        $lum = $c.R + $c.G + $c.B
        if ($lum -lt $darkest) {
            $darkest = $lum
            $bellColor = $c
        }
    }
}
Write-Host "Darkest bell pixel: $(ColorToHex $bellColor) R=$($bellColor.R) G=$($bellColor.G) B=$($bellColor.B)"

# Look at vertical center column of the bell (x = 22)
Write-Host "`nVertical slice of Bell at x=22:"
for ($y = 8; $y -lt 36; $y++) {
    $c = $img2.GetPixel(22, $y)
    Write-Host ("y={0:D2}: $(ColorToHex $c) R={1} G={2} B={3}" -f $y, $c.R, $c.G, $c.B)
}

# Let's inspect Image 3 (Gear Icon close-up)
Write-Host "`n=== Image 3: Gear Icon ==="
Write-Host "Size: $($img3.Width) x $($img3.Height)"
$gearBg = $img3.GetPixel(5, 5)
Write-Host "Gear button background: $(ColorToHex $gearBg) R=$($gearBg.R) G=$($gearBg.G) B=$($gearBg.B)"

# Sample white gear color
$brightest = 0
$gearColor = $null
for ($y = 0; $y -lt $img3.Height; $y++) {
    for ($x = 0; $x -lt $img3.Width; $x++) {
        $c = $img3.GetPixel($x, $y)
        $lum = $c.R + $c.G + $c.B
        if ($lum -gt $brightest) {
            $brightest = $lum
            $gearColor = $c
        }
    }
}
Write-Host "Brightest gear pixel: $(ColorToHex $gearColor) R=$($gearColor.R) G=$($gearColor.G) B=$($gearColor.B)"

# Vertical slice of Gear at x=22
Write-Host "`nVertical slice of Gear at x=22:"
for ($y = 8; $y -lt 36; $y++) {
    $c = $img3.GetPixel(22, $y)
    Write-Host ("y={0:D2}: $(ColorToHex $c) R={1} G={2} B={3}" -f $y, $c.R, $c.G, $c.B)
}

$img1.Dispose()
$img2.Dispose()
$img3.Dispose()

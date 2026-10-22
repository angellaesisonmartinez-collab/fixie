Add-Type -AssemblyName System.Drawing

$refImg = New-Object System.Drawing.Bitmap("C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded\media_1792341267592.png")
$ringsImg = New-Object System.Drawing.Bitmap("c:\Users\Angel Lae Martinez\Desktop\itsme-fixie1\itsme-fixie\src\assets\banner-rings-from-ref.png")

Write-Host "Reference Banner Image size: $($refImg.Width) x $($refImg.Height)"
Write-Host "Cropped rings image size: $($ringsImg.Width) x $($ringsImg.Height)"

# Check title text position in Image 3
# "Your Laboratory Overview"
$tMinX = 1000; $tMaxX = 0; $tMinY = 1000; $tMaxY = 0
for ($y = 10; $y -lt 70; $y++) {
    for ($x = 10; $x -lt 500; $x++) {
        $c = $refImg.GetPixel($x, $y)
        # dark title text
        if ($c.R -lt 40 -and $c.G -lt 60 -and $c.B -lt 40) {
            if ($x -lt $tMinX) { $tMinX = $x }
            if ($x -gt $tMaxX) { $tMaxX = $x }
            if ($y -lt $tMinY) { $tMinY = $y }
            if ($y -gt $tMaxY) { $tMaxY = $y }
        }
    }
}
Write-Host "Title bounds in Image 3: X: $tMinX to $tMaxX (w=$($tMaxX-$tMinX+1)), Y: $tMinY to $tMaxY (h=$($tMaxY-$tMinY+1))"

# Check subtitle position in Image 3:
# "Monitor laboratory readiness..."
$sMinX = 1000; $sMaxX = 0; $sMinY = 1000; $sMaxY = 0
for ($y = 65; $y -lt 110; $y++) {
    for ($x = 10; $x -lt 800; $x++) {
        $c = $refImg.GetPixel($x, $y)
        if ($c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70) {
            if ($x -lt $sMinX) { $sMinX = $x }
            if ($x -gt $sMaxX) { $sMaxX = $x }
            if ($y -lt $sMinY) { $sMinY = $y }
            if ($y -gt $sMaxY) { $sMaxY = $y }
        }
    }
}
Write-Host "Subtitle bounds in Image 3: X: $sMinX to $sMaxX (w=$($sMaxX-$sMinX+1)), Y: $sMinY to $sMaxY (h=$($sMaxY-$sMinY+1))"

$refImg.Dispose()
$ringsImg.Dispose()

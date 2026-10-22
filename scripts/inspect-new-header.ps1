Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345049348.png")
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

Write-Host "=== Image 1 (Header): $($img1.Width) x $($img1.Height) ==="
# Sample header background color
$bgH = $img1.GetPixel(300, 30)
Write-Host "Header background color: $(ColorToHex $bgH) R=$($bgH.R) G=$($bgH.G) B=$($bgH.B)"
# Bottom border line
$bLine = $img1.GetPixel(300, $img1.Height - 1)
Write-Host "Header bottom line: $(ColorToHex $bLine)"

Write-Host "`n=== Image 2 (Bell Icon close-up): $($img2.Width) x $($img2.Height) ==="
# Print ascii map of Image 2
for ($y = 0; $y -lt $img2.Height; $y++) {
    $line = ""
    for ($x = 0; $x -lt $img2.Width; $x++) {
        $c = $img2.GetPixel($x, $y)
        # dark green icon: R < 50, G < 80, B < 60
        if ($c.G -lt 80 -and $c.R -lt 50 -and $c.B -lt 60) {
            $line += "#"
        } elseif ($c.R -gt 240 -and $c.G -gt 240 -and $c.B -gt 240) {
            $line += "." # white background
        } else {
            $line += "+" # border or anti-aliasing
        }
    }
    Write-Host ("{0:D2} {1}" -f $y, $line)
}

Write-Host "`n=== Image 3 (Gear Icon close-up): $($img3.Width) x $($img3.Height) ==="
# Print ascii map of Image 3
for ($y = 0; $y -lt $img3.Height; $y++) {
    $line = ""
    for ($x = 0; $x -lt $img3.Width; $x++) {
        $c = $img3.GetPixel($x, $y)
        # white gear icon: R > 200, G > 200, B > 200
        if ($c.R -gt 200 -and $c.G -gt 200 -and $c.B -gt 200) {
            $line += "*"
        } elseif ($c.G -lt 60 -and $c.R -lt 40) {
            $line += "#" # dark green background
        } else {
            $line += "+" # border or outside
        }
    }
    Write-Host ("{0:D2} {1}" -f $y, $line)
}

$img1.Dispose()
$img2.Dispose()
$img3.Dispose()

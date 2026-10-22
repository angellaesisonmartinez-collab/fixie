Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

Write-Host "Detailed scan of Bell in Image 2:"
# Look at y from 12 to 34, find x range for each row
for ($y = 12; $y -le 33; $y++) {
    $min = -1; $max = -1
    for ($x = 0; $x -lt $img2.Width; $x++) {
        $c = $img2.GetPixel($x, $y)
        # dark pixel
        if ($c.G -lt 120 -and $c.R -lt 70) {
            if ($min -eq -1) { $min = $x }
            $max = $x
        }
    }
    Write-Host ("y={0:D2}: min={1:D2}, max={2:D2}, width={3:D2}" -f $y, $min, $max, ($max - $min + 1))
}

Write-Host "`nDetailed scan of Gear in Image 3:"
for ($y = 10; $y -le 34; $y++) {
    $min = -1; $max = -1
    for ($x = 0; $x -lt $img3.Width; $x++) {
        $c = $img3.GetPixel($x, $y)
        if ($c.R -gt 180 -and $c.G -gt 180) {
            if ($min -eq -1) { $min = $x }
            $max = $x
        }
    }
    Write-Host ("y={0:D2}: min={1:D2}, max={2:D2}, width={3:D2}" -f $y, $min, $max, ($max - $min + 1))
}

$img2.Dispose()
$img3.Dispose()

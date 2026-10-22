Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img5 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341271257.png")

# Find table header bottom
$thBottom = 0
for ($y = 40; $y -lt 150; $y++) {
    $c = $img5.GetPixel(500, $y)
    # Sage green
    if ($c.G -gt 220 -and $c.R -gt 200 -and $c.B -gt 210) {
        $thBottom = $y
    }
}
Write-Host "Header bottom: $thBottom"

# Find table footer top
$tfTop = 0
for ($y = $img5.Height - 1; $y -ge 300; $y--) {
    $c = $img5.GetPixel(500, $y)
    if ($c.G -gt 220 -and $c.R -gt 200 -and $c.B -gt 210) {
        $tfTop = $y
    }
}
Write-Host "Footer top: $tfTop"

$tableBodyHeight = $tfTop - $thBottom - 1
Write-Host "Total Table Body Height for 5 rows: $tableBodyHeight px"
Write-Host "Average Row Height: $([Math]::Round($tableBodyHeight / 5, 1)) px"

# Find each row divider line:
$dividerLines = @()
for ($y = $thBottom + 1; $y -lt $tfTop; $y++) {
    $c = $img5.GetPixel(200, $y)
    if ((ColorToHex $c) -ne "#FFFFFF") {
        # Check if line spans horizontally
        $isLine = $true
        for ($x = 100; $x -lt 900; $x += 100) {
            if ((ColorToHex $img5.GetPixel($x, $y)) -eq "#FFFFFF") {
                $isLine = $false
                break
            }
        }
        if ($isLine) {
            $dividerLines += $y
        }
    }
}
Write-Host "Divider lines found at Y: $($dividerLines -join ', ')"

$img5.Dispose()

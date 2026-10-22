Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }
$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345049348.png")

Write-Host "Scanning x=880..1023 at y=42 in Image 1:"
for ($x = 880; $x -lt $img1.Width; $x += 2) {
    $c = $img1.GetPixel($x, 42)
    if ($c.R -gt 240) {
        Write-Host "x=$x : WHITE (Bell Button) - $(ColorToHex $c)"
    } elseif ($c.G -lt 60) {
        Write-Host "x=$x : DARK (Gear Button) - $(ColorToHex $c)"
    }
}
$img1.Dispose()

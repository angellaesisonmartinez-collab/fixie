Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341261992.png")

Write-Host "Image 1 size: $($img1.Width) x $($img1.Height)"

# Sample points in right pane:
# (1) Between top bar (y=64) and banner (y=91): e.g. at (500, 75)
Write-Host "Above banner at (500, 75): $(ColorToHex $img1.GetPixel(500, 75))"

# (2) Between sidebar (x=211) and banner left edge: at (218, 120)
Write-Host "Left of banner at (218, 120): $(ColorToHex $img1.GetPixel(218, 120))"

# (3) Between banner and stat cards: at (500, 210)
Write-Host "Between banner and cards at (500, 210): $(ColorToHex $img1.GetPixel(500, 210))"

# (4) Between stat cards and recent reports: at (500, 360)
Write-Host "Between cards and reports at (500, 360): $(ColorToHex $img1.GetPixel(500, 360))"

# (5) Bottom margin below recent reports: at (500, 720)
Write-Host "Below reports at (500, 720): $(ColorToHex $img1.GetPixel(500, 720))"

# (6) Right margin next to banner: at (1015, 120)
Write-Host "Right margin at (1015, 120): $(ColorToHex $img1.GetPixel(1015, 120))"

$img1.Dispose()

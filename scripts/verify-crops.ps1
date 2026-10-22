Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345101178.png")

Write-Host "Image 2 (Bell): corner pixel (0,0): $(ColorToHex $img2.GetPixel(0, 0))"
Write-Host "Image 2 (Bell): inside pixel (10,10): $(ColorToHex $img2.GetPixel(10, 10))"

Write-Host "Image 3 (Gear): corner pixel (0,0): $(ColorToHex $img3.GetPixel(0, 0))"
Write-Host "Image 3 (Gear): inside pixel (10,10): $(ColorToHex $img3.GetPixel(10, 10))"

$img2.Dispose()
$img3.Dispose()

Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }
$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345099310.png")

Write-Host "Image 2 (Bell Button): $($img2.Width) x $($img2.Height)"
for ($y = 11; $y -le 34; $y++) {
    $line = ("y={0:D2}: " -f $y)
    for ($x = 10; $x -le 34; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.G -lt 90 -and $c.R -lt 50 -and $c.B -lt 60) {
            $line += "#"
        } elseif ($c.G -lt 150 -and $c.R -lt 110) {
            $line += "+" # mid-green anti-alias
        } elseif ($c.R -gt 240) {
            $line += " "
        } else {
            $line += "." # faint grey / edge
        }
    }
    Write-Host $line
}
$img2.Dispose()

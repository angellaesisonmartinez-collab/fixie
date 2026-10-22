Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341265320.png")

# Bell button is x: 913 to 949, y: 22 to 58
Write-Host "Bell icon bitmap (x: 920 to 942, y: 28 to 52):"
for ($y = 28; $y -le 52; $y++) {
    $line = ""
    for ($x = 920; $x -le 942; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.G -lt 90 -and $c.R -lt 70) {
            $line += "#"
        } else {
            $line += " "
        }
    }
    Write-Host $line
}

Write-Host "`nSettings icon bitmap (x: 966 to 988, y: 28 to 52):"
for ($y = 28; $y -le 52; $y++) {
    $line = ""
    for ($x = 966; $x -le 988; $x++) {
        $c = $img2.GetPixel($x, $y)
        if ($c.R -gt 200 -and $c.G -gt 200 -and $c.B -gt 200) {
            $line += "*"
        } else {
            $line += " "
        }
    }
    Write-Host $line
}

$img2.Dispose()

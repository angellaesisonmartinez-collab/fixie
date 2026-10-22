Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img4 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341269298.png")

for ($y = 118; $y -le 125; $y++) {
    $nonWhite = @()
    for ($x = 20; $x -lt 230; $x++) {
        $c = $img4.GetPixel($x, $y)
        if ((ColorToHex $c) -ne "#FFFFFF") {
            $nonWhite += (ColorToHex $c)
        }
    }
    Write-Host "y=${y} non-white count=$($nonWhite.Count), min color: $($nonWhite | Select -First 5)"
}
$img4.Dispose()

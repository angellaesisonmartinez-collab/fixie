Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\2e771f25-d970-4b0b-b267-f958f010720d\.user_uploaded\media_1792252961347.png"
$img = [System.Drawing.Bitmap]::FromFile($filePath)

# Scan a strip covering the avatar column X: 360 to 405, Y: 300 to 670
for ($y = 300; $y -lt 670; $y++) {
    $darkOrColored = 0
    for ($x = 365; $x -lt 400; $x++) {
        $p = $img.GetPixel($x, $y)
        # Check if NOT table background (table row bg is pure white #FFFFFF or pale green header)
        if ($p.R -lt 230 -or $p.G -lt 230 -or $p.B -lt 230) {
            $darkOrColored++
        }
    }
    if ($darkOrColored -gt 8) {
        Write-Host "Y=$y, non-bg pixels: $darkOrColored"
    }
}
$img.Dispose()

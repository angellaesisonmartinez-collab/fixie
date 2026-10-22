Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\2e771f25-d970-4b0b-b267-f958f010720d\.user_uploaded\media_1792252961347.png"
$img = [System.Drawing.Bitmap]::FromFile($filePath)

# Scan horizontal slice at Y = 390 (Jennelyn's avatar)
for ($x = 350; $x -lt 410; $x++) {
    $p = $img.GetPixel($x, 390)
    if ($p.R -lt 230 -or $p.G -lt 230 -or $p.B -lt 230) {
        Write-Host "X=$x color: #$($p.R.ToString('X2'))$($p.G.ToString('X2'))$($p.B.ToString('X2'))"
    }
}
$img.Dispose()

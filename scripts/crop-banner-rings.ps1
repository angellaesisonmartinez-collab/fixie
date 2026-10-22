Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\2e771f25-d970-4b0b-b267-f958f010720d\.user_uploaded\media_1792252961347.png"
$img = [System.Drawing.Bitmap]::FromFile($filePath)
$outDir = "c:\Users\Angel Lae Martinez\Desktop\itsme-fixie\itsme-fixie\src\assets"

# Banner top-right ribbon:
# Banner is roughly X: 230 to 995, Y: 100 to 230
$rect = New-Object System.Drawing.Rectangle(890, 100, 108, 130)
$crop = $img.Clone($rect, $img.PixelFormat)
$crop.Save("$outDir\banner-rings.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$img.Dispose()
Write-Host "Saved banner-rings.png"

Add-Type -AssemblyName System.Drawing
$filePath = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\2e771f25-d970-4b0b-b267-f958f010720d\.user_uploaded\media_1792252961347.png"
$img = [System.Drawing.Bitmap]::FromFile($filePath)
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()

Add-Type -AssemblyName System.Drawing

function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"

$files = @(
    "media_1792341261992.png", # Image 1: Full screen
    "media_1792341265320.png", # Image 2: Top bar
    "media_1792341267592.png", # Image 3: Banner
    "media_1792341269298.png", # Image 4: Stat cards
    "media_1792341271257.png"  # Image 5: Recent reports
)

foreach ($f in $files) {
    $path = Join-Path $dir $f
    $bmp = New-Object System.Drawing.Bitmap($path)
    Write-Host "$f : $($bmp.Width) x $($bmp.Height)"
    $bmp.Dispose()
}

# Image 2 (Top Bar) analysis
$img2 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341265320.png")
Write-Host "`n=== IMAGE 2 (Top Bar: $($img2.Width)x$($img2.Height)) ==="
# Sample background color in the middle
$bgTop = $img2.GetPixel(100, [int]($img2.Height / 2))
Write-Host "Top Bar Background Color: $(ColorToHex $bgTop) R=$($bgTop.R) G=$($bgTop.G) B=$($bgTop.B)"
# Bottom pixel line color
$bottomLine = $img2.GetPixel(100, $img2.Height - 1)
Write-Host "Top Bar Bottom line: $(ColorToHex $bottomLine)"
$img2.Dispose()

# Image 3 (Banner) analysis
$img3 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341267592.png")
Write-Host "`n=== IMAGE 3 (Banner: $($img3.Width)x$($img3.Height)) ==="
$bgBanner = $img3.GetPixel(100, 20)
Write-Host "Banner Background Color: $(ColorToHex $bgBanner)"
$borderBanner = $img3.GetPixel(0, 0)
Write-Host "Banner Outer corner: $(ColorToHex $borderBanner)"
$img3.Dispose()

# Image 4 (Stat Cards) analysis
$img4 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341269298.png")
Write-Host "`n=== IMAGE 4 (Stat Cards: $($img4.Width)x$($img4.Height)) ==="
$bgCard = $img4.GetPixel(50, 50)
Write-Host "Stat Card Background Color: $(ColorToHex $bgCard)"
$img4.Dispose()

# Image 5 (Recent Reports) analysis
$img5 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341271257.png")
Write-Host "`n=== IMAGE 5 (Recent Reports: $($img5.Width)x$($img5.Height)) ==="
$bgReports = $img5.GetPixel(50, 10)
Write-Host "Recent Reports Background Color: $(ColorToHex $bgReports)"
$img5.Dispose()

# Image 1 (Full Screen) analysis
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341261992.png")
Write-Host "`n=== IMAGE 1 (Full Screen: $($img1.Width)x$($img1.Height)) ==="
# Left sidebar bg
$bgSide = $img1.GetPixel(50, 200)
Write-Host "Sidebar Background: $(ColorToHex $bgSide)"
# Top bar bg in full screen
$bgTopFull = $img1.GetPixel(500, 30)
Write-Host "Top Bar in Full Screen: $(ColorToHex $bgTopFull)"
# Content bg in full screen (between banner and stat cards)
$bgContentFull = $img1.GetPixel(500, 120)
Write-Host "Content area background (below top bar): $(ColorToHex $bgContentFull)"
$img1.Dispose()

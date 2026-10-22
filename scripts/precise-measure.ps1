Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792341261992.png")

# Let's inspect Image 5 (Recent reports in Full screen)
# Where does Recent reports table start and end horizontally?
# At y=500 in Image 1:
$rLeft = 0; $rRight = 0
for ($x = 211; $x -lt 1024; $x++) {
    if ((ColorToHex $img1.GetPixel($x, 500)) -eq "#FFFFFF") {
        $rLeft = $x; break
    }
}
for ($x = 1023; $x -ge 211; $x--) {
    if ((ColorToHex $img1.GetPixel($x, 500)) -eq "#FFFFFF") {
        $rRight = $x; break
    }
}
Write-Host "Reports card in Image 1: left=$rLeft, right=$rRight (w=$($rRight - $rLeft + 1))"
Write-Host "Left margin from sidebar (211): $($rLeft - 211) px"
Write-Host "Right margin from screen edge (1024): $(1024 - $rRight - 1) px"

# Check vertical spacing between Banner, Stat Cards, and Reports in Image 1:
# Let's find the bottom of Banner: scan downwards at x=300
$bannerTop = 0; $bannerBottom = 0
for ($y = 65; $y -lt 300; $y++) {
    $isWhite = ((ColorToHex $img1.GetPixel(300, $y)) -eq "#FFFFFF")
    if ($isWhite -and $bannerTop -eq 0) { $bannerTop = $y }
    if (-not $isWhite -and $bannerTop -ne 0) { $bannerBottom = $y - 1; break }
}
Write-Host "Banner Y: $bannerTop to $bannerBottom (height = $($bannerBottom - $bannerTop + 1))"

# Stat cards Y:
$cardsTop = 0; $cardsBottom = 0
for ($y = $bannerBottom + 1; $y -lt 500; $y++) {
    $isWhite = ((ColorToHex $img1.GetPixel(300, $y)) -eq "#FFFFFF")
    if ($isWhite -and $cardsTop -eq 0) { $cardsTop = $y }
    if (-not $isWhite -and $cardsTop -ne 0) { $cardsBottom = $y - 1; break }
}
Write-Host "Gap between Banner and Cards: $($cardsTop - $bannerBottom - 1) px"
Write-Host "Cards Y: $cardsTop to $cardsBottom (height = $($cardsBottom - $cardsTop + 1))"

# Reports Y:
$reportsTop = 0; $reportsBottom = 0
for ($y = $cardsBottom + 1; $y -lt 728; $y++) {
    $isWhite = ((ColorToHex $img1.GetPixel(300, $y)) -eq "#FFFFFF")
    if ($isWhite -and $reportsTop -eq 0) { $reportsTop = $y }
    if (-not $isWhite -and $reportsTop -ne 0) { $reportsBottom = $y - 1; break }
}
Write-Host "Gap between Cards and Reports: $($reportsTop - $cardsBottom - 1) px"
Write-Host "Reports Y: $reportsTop to $reportsBottom (height = $($reportsBottom - $reportsTop + 1))"

$img1.Dispose()

Add-Type -AssemblyName System.Drawing
function ColorToHex($c) { return "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B }

$dir = "C:\Users\Angel Lae Martinez\.gemini\antigravity-ide\brain\3e934748-afa8-4e9b-81cc-7c8f1442e5f3\.user_uploaded"
$img1 = New-Object System.Drawing.Bitmap(Join-Path $dir "media_1792345049348.png")

Write-Host "Image 1 Dimensions: $($img1.Width) x $($img1.Height)"

# Scan each column from right to left to find button bounding boxes
# A pixel belongs to a button if its color is not header background #B5D1BF
$bgR = 181; $bgG = 209; $bgB = 191

$minX = 9999; $maxX = 0; $minY = 9999; $maxY = 0

# Let's find columns where buttons exist
$colHasBtn = @()
for ($x = 0; $x -lt $img1.Width; $x++) {
    $hasBtn = $false
    for ($y = 0; $y -lt $img1.Height - 3; $y++) {
        $c = $img1.GetPixel($x, $y)
        $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
        if ($diff -gt 40) {
            $hasBtn = $true
            break
        }
    }
    if ($hasBtn) {
        $colHasBtn += $x
    }
}

Write-Host "Button columns range: min=$($colHasBtn[0]) max=$($colHasBtn[-1])"
Write-Host "Right margin: $($img1.Width - 1 - $colHasBtn[-1]) px"

# Let's group contiguous column ranges to find individual buttons
$buttons = @()
$start = $null
$prev = $null
foreach ($col in $colHasBtn) {
    if ($null -eq $start) {
        $start = $col
        $prev = $col
    } elseif ($col -eq $prev + 1) {
        $prev = $col
    } else {
        $buttons += [PSCustomObject]@{ Start = $start; End = $prev; Width = ($prev - $start + 1) }
        $start = $col
        $prev = $col
    }
}
if ($null -ne $start) {
    $buttons += [PSCustomObject]@{ Start = $start; End = $prev; Width = ($prev - $start + 1) }
}

Write-Host "`nDetected Buttons in Header (Left to Right):"
foreach ($b in $buttons) {
    # Find Y bounds for this button
    $bMinY = 9999; $bMaxY = 0
    for ($x = $b.Start; $x -le $b.End; $x++) {
        for ($y = 0; $y -lt $img1.Height - 3; $y++) {
            $c = $img1.GetPixel($x, $y)
            $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
            if ($diff -gt 40) {
                if ($y -lt $bMinY) { $bMinY = $y }
                if ($y -gt $bMaxY) { $bMaxY = $y }
            }
        }
    }
    $height = $bMaxY - $bMinY + 1
    # Sample center pixel
    $midX = [int](($b.Start + $b.End) / 2)
    $sampleC = $img1.GetPixel($midX, $bMinY + 5)
    Write-Host ("Button: x={0}..{1} (width={2}px), y={3}..{4} (height={5}px), topOffset={6}px, bottomOffset={7}px, color={8}" -f $b.Start, $b.End, $b.Width, $bMinY, $bMaxY, $height, $bMinY, ($img1.Height - 1 - $bMaxY), (ColorToHex $sampleC))
}

if ($buttons.Count -ge 2) {
    $gap = $buttons[1].Start - $buttons[0].End - 1
    Write-Host "Gap between buttons: $gap px"
}

$img1.Dispose()

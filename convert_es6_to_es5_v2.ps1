$nodeFiles = @(
    "src/nodes/base.js",
    "src/nodes/math.js", 
    "src/nodes/logic.js",
    "src/nodes/strings.js",
    "src/nodes/events.js",
    "src/nodes/interface.js",
    "src/nodes/input.js",
    "src/nodes/graphics.js",
    "src/nodes/geometry.js",
    "src/nodes/audio.js",
    "src/nodes/midi.js",
    "src/nodes/network.js",
    "src/nodes/objects.js",
    "src/nodes/html.js",
    "src/nodes/others.js"
)

foreach ($file in $nodeFiles) {
    if (Test-Path $file) {
        Write-Host "Converting $file..."
        $lines = Get-Content $file
        $newLines = @()
        $inClass = $false
        $className = ""
        $staticProps = @()
        
        foreach ($line in $lines) {
            # Skip import statements
            if ($line -match '^import\s+') {
                continue
            }
            
            # Skip export statements
            $line = $line -replace '^export\s+', ''
            
            # Detect class start
            if ($line -match '^class\s+(\w+)\s*\{') {
                $className = $matches[1]
                $newLines += "function $className() {"
                $inClass = $true
                continue
            }
            
            # Handle static properties
            if ($inClass -and $line -match '^\s*static\s+(\w+)\s*=\s*(.+);?') {
                $propName = $matches[1]
                $propValue = $matches[2] -replace ';$', ''
                $staticProps += "$className.$propName = $propValue;"
                continue
            }
            
            # Handle constructor
            if ($inClass -and $line -match '^\s*constructor\(\)\s*\{') {
                continue
            }
            
            # Handle methods
            if ($inClass -and $line -match '^\s*(\w+)\(([^)]*)\)\s*\{') {
                $methodName = $matches[1]
                $params = $matches[2]
                $newLines += "$className.prototype.$methodName = function($params) {"
                continue
            }
            
            # Handle class end
            if ($inClass -and $line -match '^\}') {
                $newLines += "}"
                $newLines += $staticProps
                $staticProps = @()
                $inClass = $false
                $className = ""
                continue
            }
            
            # Regular line
            $newLines += $line
        }
        
        Set-Content $file $newLines -Encoding UTF8
        Write-Host "Converted $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Conversion complete!"
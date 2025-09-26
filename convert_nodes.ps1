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
        $content = Get-Content $file -Raw
        
        # Remove export statements
        $content = $content -replace "export\s+", ""
        
        # Convert class declarations to function constructors
        $content = $content -replace "class\s+(\w+)\s*\{", 'function $1() {'
        
        # Convert static properties to function properties  
        $content = $content -replace "static\s+(\w+)\s*=\s*([^;]+);", '$1.$1 = $2;'
        
        # Convert methods to prototype methods (basic pattern)
        $content = $content -replace "(\w+)\s*\([^)]*\)\s*\{", '$1.prototype.$1 = function() {'
        
        Set-Content $file $content -Encoding UTF8
        Write-Host "Converted $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Conversion complete!"

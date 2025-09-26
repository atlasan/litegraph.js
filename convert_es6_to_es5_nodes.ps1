# Convert ES6 classes to ES5 functions in node files
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
        
        # Remove export statements first
        $content = $content -replace 'export\s+class\s+', 'class '
        $content = $content -replace 'export\s+\{[^}]*\};?', ''
        $content = $content -replace 'export\s+default\s+\w+;?', ''
        
        # Convert ES6 classes to ES5 function constructors
        # This regex captures class name and constructor content
        $content = $content -replace '(?s)class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\s*constructor\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', 'function $1() {$3}'
        
        # Handle classes without explicit constructor
        $content = $content -replace '(?s)class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{', 'function $1() {'
        
        # Convert static properties to function properties
        $content = $content -replace 'static\s+(\w+)\s*=\s*([^;]+);', '$1.$1 = $2;'
        
        # Convert methods to prototype methods (simple case)
        $content = $content -replace '(\w+)\s*\([^)]*\)\s*\{', '$1.prototype.$1 = function() {'
        
        Set-Content -Path $file -Value $content -Encoding UTF8
        Write-Host "Converted $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "ES6 to ES5 conversion completed!"
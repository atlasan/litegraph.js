# Convert ES6 to ES5 in LiteGraph node files
$nodeFiles = Get-ChildItem -Path "C:\WWW\litegraph_ATLASAN\src\nodes" -Filter "*.js" -Recurse

foreach ($file in $nodeFiles) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content $file.FullName -Raw
    
    # Convert class declarations to function constructors
    $content = $content -replace 'class\s+(\w+)\s*\{', 'function $1() {'
    $content = $content -replace 'class\s+(\w+)\s+extends\s+(\w+)\s*\{', 'function $1() { $2.call(this);'
    
    # Convert static properties
    $content = $content -replace 'static\s+(\w+)\s*=\s*([^;]+);', '$1.$1 = $2;'
    
    # Remove constructor() method wrapper and fix indentation
    $content = $content -replace 'constructor\(\)\s*\{([^}]*)\}', '$1'
    
    # Convert methods to prototype methods
    $content = $content -replace '(\s+)(\w+)\s*\([^)]*\)\s*\{', '$1$2.prototype.$2 = function() {'
    
    Set-Content -Path $file.FullName -Value $content
}

Write-Host "ES6 to ES5 conversion completed!"
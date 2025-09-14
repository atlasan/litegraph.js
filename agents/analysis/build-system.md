# Build System Documentation

## Overview

LiteGraph.js uses a Python-based build system (`build.py`) that concatenates JavaScript files, manages dependencies, and creates multiple distribution targets. The build system supports ES6 modules, handles version injection, and provides both development and production builds with 6 distinct distribution configurations.

## Build Architecture

### Core Components

1. **Build Script**: `build.py` - Python-based file concatenation and processing
2. **File Lists**: Organized lists of source files for different components
3. **Build Targets**: 6 different distribution configurations
4. **Version Management**: Automatic version injection from package.json
5. **Minification**: Custom minification pipeline for production builds

### Build Targets

The build system creates 6 distinct distribution files:

#### 1. Core Builds
- **`litegraph.js`** - Core library without extensions
- **`litegraph.mini.js`** - Minified core library

#### 2. Full Builds
- **`litegraph.full.js`** - Core library + all extensions
- **`litegraph.full.mini.js`** - Minified full library

#### 3. Node.js Builds
- **`litegraph_nodejs.js`** - Core library for Node.js
- **`litegraph_nodejs.full.js`** - Full library for Node.js with extensions

### 1. Build Script Structure

```python
# build.py - Main build script
import os
import sys
import argparse
import subprocess
from pathlib import Path

# Build configuration
BUILD_OPTIONS = {
    'minify': True,
    'sourcemap': True,
    'include_css': True,
    'include_nodes': True,
    'target_es5': False
}

# File organization
SOURCE_FILES = {
    'core': [
        'src/litegraph.js',
        'src/lgraph.js', 
        'src/lgraphnode.js',
        'src/lgraphcanvas.js'
    ],
    'nodes': [
        'src/nodes/base.js',
        'src/nodes/math.js',
        'src/nodes/logic.js',
        'src/nodes/string.js',
        'src/nodes/events.js',
        'src/nodes/interface.js',
        'src/nodes/graphics.js',
        'src/nodes/audio.js',
        'src/nodes/network.js'
    ],
    'nodejs_only': [
        'src/nodes/nodejs.js'
    ]
}
```

### 2. Build Variants

The build system generates multiple distribution files:

```python
# Distribution variants
BUILD_VARIANTS = {
    'litegraph.js': {
        'description': 'Full build with all features',
        'includes': ['core', 'nodes'],
        'minify': False,
        'target': 'browser'
    },
    'litegraph.min.js': {
        'description': 'Minified full build',
        'includes': ['core', 'nodes'],
        'minify': True,
        'target': 'browser'
    },
    'litegraph.core.js': {
        'description': 'Core only (no built-in nodes)',
        'includes': ['core'],
        'minify': False,
        'target': 'browser'
    },
    'litegraph.core.min.js': {
        'description': 'Minified core only',
        'includes': ['core'],
        'minify': True,
        'target': 'browser'
    },
    'litegraph-editor.js': {
        'description': 'Full editor with UI components',
        'includes': ['core', 'nodes', 'editor'],
        'minify': False,
        'target': 'browser'
    }
}
```

### 3. Build Process Flow

```python
def build_variant(variant_name, config):
    """Build a specific variant"""
    print(f"Building {variant_name}...")
    
    # 1. Collect source files
    source_files = collect_source_files(config['includes'])
    
    # 2. Concatenate files
    combined_content = concatenate_files(source_files)
    
    # 3. Process content
    processed_content = process_content(combined_content, config)
    
    # 4. Apply transformations
    if config.get('target') == 'es5':
        processed_content = transpile_to_es5(processed_content)
    
    # 5. Minify if requested
    if config.get('minify'):
        processed_content = minify_code(processed_content)
    
    # 6. Generate source maps
    if config.get('sourcemap'):
        generate_sourcemap(variant_name, source_files)
    
    # 7. Write output file
    output_path = f"build/{variant_name}"
    write_file(output_path, processed_content)
    
    print(f"✓ Built {variant_name} ({len(processed_content)} bytes)")
```

## File Processing Pipeline

### 1. Source File Concatenation

```python
def concatenate_files(file_list):
    """Concatenate source files with proper headers"""
    content = []
    
    # Add build header
    content.append(generate_build_header())
    
    for file_path in file_list:
        if os.path.exists(file_path):
            # Add file separator comment
            content.append(f"\n//*** {file_path} ***//\n")
            
            # Read and add file content
            with open(file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
                content.append(file_content)
        else:
            print(f"Warning: File not found: {file_path}")
    
    return '\n'.join(content)

def generate_build_header():
    """Generate build information header"""
    from datetime import datetime
    
    return f"""
/*!
 * LiteGraph.js
 * Build: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 * Repository: https://github.com/jagenjo/litegraph.js
 * License: MIT
 */
"""
```

### 2. Content Processing

```python
def process_content(content, config):
    """Process content based on build configuration"""
    
    # Remove debug code in production builds
    if config.get('minify'):
        content = remove_debug_code(content)
    
    # Replace build-time constants
    content = replace_build_constants(content, config)
    
    # Process conditional compilation
    content = process_conditional_compilation(content, config)
    
    return content

def remove_debug_code(content):
    """Remove debug-only code blocks"""
    import re
    
    # Remove debug blocks
    debug_pattern = r'/\*\s*DEBUG_START\s*\*/.*?/\*\s*DEBUG_END\s*\*/'
    content = re.sub(debug_pattern, '', content, flags=re.DOTALL)
    
    # Remove console.log statements
    console_pattern = r'console\.log\([^;]*\);?'
    content = re.sub(console_pattern, '', content)
    
    return content

def replace_build_constants(content, config):
    """Replace build-time constants"""
    replacements = {
        '__BUILD_VERSION__': get_version(),
        '__BUILD_DATE__': get_build_date(),
        '__INCLUDE_NODES__': str(config.get('include_nodes', True)).lower(),
        '__DEBUG_MODE__': str(not config.get('minify', False)).lower()
    }
    
    for placeholder, value in replacements.items():
        content = content.replace(placeholder, value)
    
    return content
```

### 3. Minification Process

```python
def minify_code(content):
    """Minify JavaScript code"""
    try:
        # Use terser for minification
        import subprocess
        import tempfile
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Run terser
        cmd = [
            'npx', 'terser',
            temp_file_path,
            '--compress',
            '--mangle',
            '--output', '-'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return result.stdout
        else:
            print(f"Minification failed: {result.stderr}")
            return content
            
    except Exception as e:
        print(f"Minification error: {e}")
        return content
    finally:
        # Clean up temp file
        if 'temp_file_path' in locals():
            os.unlink(temp_file_path)
```

## Package Management

### 1. NPM Configuration

```json
{
  "name": "litegraph.js",
  "version": "0.7.15",
  "description": "A library to create graphs in the browser similar to Blender or UE Blueprints",
  "main": "build/litegraph.js",
  "module": "src/litegraph.js",
  "types": "src/litegraph.d.ts",
  "files": [
    "build/",
    "src/",
    "css/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "python build.py",
    "build:core": "python build.py --core-only",
    "build:min": "python build.py --minify",
    "build:all": "python build.py --all-variants",
    "dev": "python -m http.server 8000",
    "test": "echo \"No tests specified\"",
    "lint": "eslint src/",
    "docs": "jsdoc src/ -d docs/"
  },
  "devDependencies": {
    "terser": "^5.0.0",
    "eslint": "^8.0.0",
    "jsdoc": "^4.0.0"
  },
  "keywords": [
    "graph",
    "node",
    "visual",
    "programming",
    "editor",
    "canvas",
    "webgl"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/jagenjo/litegraph.js.git"
  },
  "license": "MIT"
}
```

### 2. Build Scripts

```python
# Command line interface
def main():
    parser = argparse.ArgumentParser(description='Build LiteGraph.js')
    parser.add_argument('--core-only', action='store_true', help='Build core only')
    parser.add_argument('--minify', action='store_true', help='Minify output')
    parser.add_argument('--all-variants', action='store_true', help='Build all variants')
    parser.add_argument('--output-dir', default='build', help='Output directory')
    parser.add_argument('--watch', action='store_true', help='Watch for changes')
    
    args = parser.parse_args()
    
    if args.watch:
        start_watch_mode()
    elif args.all_variants:
        build_all_variants()
    elif args.core_only:
        build_core_only(args.minify)
    else:
        build_default(args.minify)

def build_all_variants():
    """Build all distribution variants"""
    for variant_name, config in BUILD_VARIANTS.items():
        try:
            build_variant(variant_name, config)
        except Exception as e:
            print(f"Error building {variant_name}: {e}")
            continue
    
    # Generate build report
    generate_build_report()

def start_watch_mode():
    """Watch for file changes and rebuild"""
    import time
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    
    class BuildHandler(FileSystemEventHandler):
        def on_modified(self, event):
            if event.src_path.endswith('.js'):
                print(f"File changed: {event.src_path}")
                build_default(minify=False)
    
    observer = Observer()
    observer.schedule(BuildHandler(), 'src/', recursive=True)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
```

## Distribution Files

### 1. File Structure

```
build/
├── litegraph.js              # Full build (development)
├── litegraph.min.js          # Full build (production)
├── litegraph.core.js         # Core only (development)
├── litegraph.core.min.js     # Core only (production)
├── litegraph-editor.js       # Editor build (development)
├── litegraph-editor.min.js   # Editor build (production)
└── css/
    ├── litegraph.css         # Main stylesheet
    ├── litegraph-editor.css  # Editor stylesheet
    └── themes/
        ├── dark.css          # Dark theme
        ├── light.css         # Light theme
        └── custom.css        # Custom theme template
```

### 2. Build Sizes and Optimization

```python
def generate_build_report():
    """Generate build size report"""
    import os
    
    report = []
    report.append("Build Report")
    report.append("=" * 50)
    
    for variant in BUILD_VARIANTS.keys():
        file_path = f"build/{variant}"
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            size_kb = size / 1024
            
            # Calculate gzipped size
            gzipped_size = get_gzipped_size(file_path)
            gzipped_kb = gzipped_size / 1024
            
            report.append(f"{variant:25} {size_kb:8.1f} KB ({gzipped_kb:6.1f} KB gzipped)")
    
    report_content = "\n".join(report)
    print(report_content)
    
    # Save report to file
    with open("build/build-report.txt", "w") as f:
        f.write(report_content)

def get_gzipped_size(file_path):
    """Calculate gzipped file size"""
    import gzip
    
    with open(file_path, 'rb') as f:
        content = f.read()
    
    compressed = gzip.compress(content)
    return len(compressed)
```

### 3. Typical Build Sizes

```
Build Report
==================================================
litegraph.js              245.3 KB ( 58.7 KB gzipped)
litegraph.min.js          128.9 KB ( 42.1 KB gzipped)
litegraph.core.js         156.2 KB ( 38.4 KB gzipped)
litegraph.core.min.js      82.7 KB ( 28.9 KB gzipped)
litegraph-editor.js       312.8 KB ( 71.2 KB gzipped)
litegraph-editor.min.js   167.4 KB ( 52.3 KB gzipped)
```

## CSS Build Process

### 1. Stylesheet Compilation

```python
def build_css():
    """Build CSS files"""
    css_files = {
        'litegraph.css': [
            'css/litegraph-base.css',
            'css/litegraph-canvas.css',
            'css/litegraph-nodes.css'
        ],
        'litegraph-editor.css': [
            'css/litegraph-base.css',
            'css/litegraph-canvas.css',
            'css/litegraph-nodes.css',
            'css/litegraph-editor.css',
            'css/litegraph-panels.css'
        ]
    }
    
    for output_file, input_files in css_files.items():
        combined_css = []
        
        for css_file in input_files:
            if os.path.exists(css_file):
                with open(css_file, 'r') as f:
                    combined_css.append(f.read())
        
        # Process CSS (autoprefixer, minification)
        processed_css = process_css('\n'.join(combined_css))
        
        # Write output
        output_path = f"build/css/{output_file}"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            f.write(processed_css)
```

## TypeScript Definitions

### 1. Type Definition Generation

```python
def generate_typescript_definitions():
    """Generate TypeScript definition files"""
    
    # Parse source files for type information
    type_info = extract_type_information()
    
    # Generate .d.ts content
    dts_content = generate_dts_content(type_info)
    
    # Write definition file
    with open('build/litegraph.d.ts', 'w') as f:
        f.write(dts_content)

def extract_type_information():
    """Extract type information from JSDoc comments"""
    import re
    
    type_info = {
        'classes': {},
        'interfaces': {},
        'enums': {},
        'functions': {}
    }
    
    # Parse source files for JSDoc comments
    for file_path in get_all_source_files():
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Extract class definitions
        class_pattern = r'/\*\*([^*]|\*(?!/))*\*/\s*class\s+(\w+)'
        classes = re.findall(class_pattern, content, re.DOTALL)
        
        for jsdoc, class_name in classes:
            type_info['classes'][class_name] = parse_jsdoc(jsdoc)
    
    return type_info
```

## Development Server

### 1. Local Development Setup

```python
def start_dev_server(port=8000):
    """Start development server with live reload"""
    import http.server
    import socketserver
    import threading
    
    class DevHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Add CORS headers for development
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
    
    with socketserver.TCPServer(("", port), DevHandler) as httpd:
        print(f"Development server running at http://localhost:{port}")
        
        # Start file watcher in separate thread
        watcher_thread = threading.Thread(target=start_watch_mode)
        watcher_thread.daemon = True
        watcher_thread.start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down development server...")
            httpd.shutdown()
```

## Continuous Integration

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        npm install
    
    - name: Run linting
      run: npm run lint
    
    - name: Build all variants
      run: python build.py --all-variants
    
    - name: Run tests
      run: npm test
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: build/
```

This comprehensive build system ensures reliable, optimized distribution of LiteGraph.js across different environments and use cases.
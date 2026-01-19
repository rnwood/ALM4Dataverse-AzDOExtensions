#!/bin/bash

# Build script for ALM4Dataverse Azure DevOps Extensions

set -e

echo "Cleaning previous build..."
rm -rf dist

echo "Installing dependencies..."
npm install

echo "Compiling TypeScript..."
npm run build

echo "Copying task metadata..."
cp src/tasks/set-connection-variables/task.json dist/tasks/set-connection-variables/

echo "Copying package.json to task folder..."
cat > dist/tasks/set-connection-variables/package.json << 'EOF'
{
  "name": "alm4dataverse-set-connection-variables",
  "version": "1.0.0",
  "description": "ALM4Dataverse Set Connection Variables task",
  "main": "index.js",
  "dependencies": {
    "azure-pipelines-task-lib": "^4.13.0"
  }
}
EOF

echo "Installing task dependencies..."
cd dist/tasks/set-connection-variables
npm install --production
cd ../../..

echo "Build complete!"
echo ""
echo "Task location: dist/tasks/set-connection-variables"
echo ""
echo "To package the extension, run:"
echo "  npm install -g tfx-cli"
echo "  tfx extension create --manifest-globs vss-extension.json"

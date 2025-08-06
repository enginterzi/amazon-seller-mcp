#!/bin/bash

# Setup script for git hooks
# Installs pre-commit hooks for test maintenance

echo "🔧 Setting up git hooks for test maintenance..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully"
echo ""
echo "The pre-commit hook will now run test health checks before each commit."
echo "To skip the hook for a specific commit, use: git commit --no-verify"
echo ""
echo "To manually run the health check: npm run test:maintenance health-check"
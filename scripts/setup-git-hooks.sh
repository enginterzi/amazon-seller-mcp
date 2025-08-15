#!/bin/bash

# Setup script for git hooks
# Installs comprehensive pre-commit quality validation hooks

echo "🔧 Setting up git hooks for quality validation..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Check if .git directory exists (we're in a git repository)
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this script from the project root."
    exit 1
fi

# Copy pre-commit hook
if [ -f ".github/hooks/pre-commit" ]; then
    cp .github/hooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed successfully"
else
    echo "❌ Error: Pre-commit hook source file not found at .github/hooks/pre-commit"
    exit 1
fi

# Verify hook is executable
if [ -x ".git/hooks/pre-commit" ]; then
    echo "✅ Pre-commit hook is executable"
else
    echo "❌ Error: Pre-commit hook is not executable"
    exit 1
fi

echo ""
echo "🎉 Git hooks setup complete!"
echo ""
echo "The pre-commit hook will now enforce the following quality gates:"
echo "  ✓ Zero lint errors (ESLint)"
echo "  ✓ Successful TypeScript build"
echo "  ✓ All tests passing"
echo "  ✓ Code formatting (Prettier)"
echo "  ✓ Test health validation (warning only)"
echo ""
echo "📝 Usage:"
echo "  • Normal commit: git commit -m 'your message'"
echo "  • Skip validation (not recommended): git commit --no-verify -m 'your message'"
echo "  • Manual quality check: npm run lint && npm test && npm run build"
echo ""
echo "💡 Tips:"
echo "  • Run 'npm run format' to auto-fix formatting issues"
echo "  • Run 'npm run lint -- --fix' to auto-fix lint issues"
echo "  • Run 'npm run test:maintenance health-check' for detailed test health analysis"
#!/bin/bash
# Automated release script for amazon-seller-mcp

set -e

BRANCH_NAME=$(git branch --show-current)
VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process..."
echo "Current branch: $BRANCH_NAME"
echo "Version bump: $VERSION_TYPE"

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major|prerelease)$ ]]; then
    echo "❌ Invalid version type. Use: patch, minor, major, or prerelease"
    exit 1
fi

# Check if we're on a feature branch (not main)
if [ "$BRANCH_NAME" = "main" ]; then
    echo "❌ Cannot release from main branch. Switch to a feature branch first."
    exit 1
fi

# Pre-release checks
echo "📋 Running pre-release checks..."
echo "  - Running tests..."
npm run test:validation

echo "  - Building project..."
npm run build

echo "  - Checking linting..."
npm run lint

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Version bump
echo "📦 Bumping version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Update changelog prompt
echo "📝 Please update CHANGELOG.md with release notes for version $NEW_VERSION"
echo "Press Enter when ready to continue..."
read

# Merge to main
echo "🔄 Merging to main..."
git checkout main
git pull origin main
git merge $BRANCH_NAME --no-ff -m "feat: merge $BRANCH_NAME for release $NEW_VERSION"
git push origin main

# Create tag
echo "🏷️  Creating tag..."
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
git push origin "v$NEW_VERSION"

# Publish to npm
echo "📤 Publishing to npm..."
npm publish

# Switch back to feature branch
git checkout $BRANCH_NAME

echo "✅ Release $NEW_VERSION completed successfully!"
echo "🔗 View on npm: https://www.npmjs.com/package/amazon-seller-mcp"
echo "🔗 View on GitHub: https://github.com/enginterzi/amazon-seller-mcp/releases/tag/v$NEW_VERSION"

# Optional: Clean up feature branch
echo ""
echo "🧹 Do you want to delete the feature branch '$BRANCH_NAME'? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    git checkout main
    git branch -d $BRANCH_NAME
    git push origin --delete $BRANCH_NAME
    echo "✅ Feature branch '$BRANCH_NAME' deleted"
fi
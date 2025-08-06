# Deployment Instructions

This document provides step-by-step instructions for creating releases, merging changes, and publishing to npm.

## Prerequisites

- Node.js 18.0.0+ installed
- npm account with publish permissions
- Git repository access
- All tests passing locally

## Release Process

### 1. Pre-Release Checklist

```bash
# Ensure you're on the feature branch
git status

# Run full test suite
npm run test:validation

# Check build works
npm run build

# Verify linting
npm run lint

# Check formatting
npm run format
```

### 2. Version Bump

Choose the appropriate version bump based on changes:

- **Patch** (0.1.0 → 0.1.1): Bug fixes, minor improvements
- **Minor** (0.1.0 → 0.2.0): New features, backwards compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

```bash
# For patch version
npm version patch

# For minor version
npm version minor

# For major version
npm version major
```

### 3. Update Changelog

Edit `CHANGELOG.md` to document changes:

```markdown
## [0.2.0] - 2025-01-08

### Added
- New feature descriptions
- Improvements made

### Fixed
- Bug fixes
- Issues resolved

### Changed
- Breaking changes (if any)
```

### 4. Merge to Main Branch

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge test-refactoring-improvement

# Push merged changes
git push origin main
```

### 5. Create Git Tag

```bash
# Create annotated tag
git tag -a v0.2.0 -m "Release version 0.2.0"

# Push tag to remote
git push origin v0.2.0
```

### 6. Publish to npm

```bash
# Login to npm (if not already logged in)
npm login

# Publish package
npm publish

# Verify publication
npm view amazon-seller-mcp
```

### 7. Post-Release Tasks

```bash
# Clean up feature branch (optional)
git branch -d test-refactoring-improvement
git push origin --delete test-refactoring-improvement

# Create GitHub release (optional)
# Go to GitHub repository → Releases → Create new release
```

## Automated Release Script

For convenience, you can use this automated script:

```bash
#!/bin/bash
# save as scripts/release.sh

set -e

BRANCH_NAME=$(git branch --show-current)
VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process..."
echo "Current branch: $BRANCH_NAME"
echo "Version bump: $VERSION_TYPE"

# Pre-release checks
echo "📋 Running pre-release checks..."
npm run test:validation
npm run build

# Version bump
echo "📦 Bumping version..."
npm version $VERSION_TYPE

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Merge to main
echo "🔄 Merging to main..."
git checkout main
git pull origin main
git merge $BRANCH_NAME
git push origin main

# Create tag
echo "🏷️  Creating tag..."
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
git push origin "v$NEW_VERSION"

# Publish to npm
echo "📤 Publishing to npm..."
npm publish

echo "✅ Release $NEW_VERSION completed successfully!"
echo "🔗 View on npm: https://www.npmjs.com/package/amazon-seller-mcp"
```

Make it executable:
```bash
chmod +x scripts/release.sh
```

Usage:
```bash
# Patch release
./scripts/release.sh patch

# Minor release
./scripts/release.sh minor

# Major release
./scripts/release.sh major
```

## Rollback Process

If you need to rollback a release:

```bash
# Unpublish from npm (within 24 hours)
npm unpublish amazon-seller-mcp@0.2.0

# Remove git tag
git tag -d v0.2.0
git push origin --delete v0.2.0

# Revert version in package.json
git checkout HEAD~1 -- package.json
git commit -m "Revert version bump"
git push origin main
```

## Environment Variables for CI/CD

If using automated deployment:

```bash
NPM_TOKEN=your_npm_token
GITHUB_TOKEN=your_github_token
```

## Troubleshooting

### Common Issues

1. **npm publish fails**: Check if you're logged in and have permissions
2. **Version already exists**: Bump version again or use `npm version prerelease`
3. **Tests fail**: Fix issues before proceeding with release
4. **Git conflicts**: Resolve conflicts during merge process

### Recovery Commands

```bash
# Reset version bump if needed
git reset --hard HEAD~1

# Force push (use carefully)
git push --force-with-lease origin main

# Check npm package status
npm view amazon-seller-mcp versions --json
```

## Best Practices

- Always run tests before releasing
- Use semantic versioning consistently
- Document all changes in CHANGELOG.md
- Create meaningful commit messages
- Tag releases for easy tracking
- Keep feature branches focused and short-lived
- Review changes before merging to main
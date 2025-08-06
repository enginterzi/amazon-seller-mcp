# Contributing to Amazon Seller MCP

Thank you for your interest in contributing to Amazon Seller MCP! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Testing Requirements](#testing-requirements)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## 🤝 Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Git for version control
- Amazon SP-API credentials for testing (optional)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/amazon-seller-mcp.git
   cd amazon-seller-mcp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Git Hooks**
   ```bash
   npm run setup:hooks
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Build Project**
   ```bash
   npm run build
   ```

## 🧪 Testing Requirements

We maintain high testing standards with comprehensive coverage and quality requirements.

### Test Standards

- **Test Pass Rate**: Minimum 95% (currently 96.5%)
- **Line Coverage**: Minimum 80% (currently 82.4%)
- **Branch Coverage**: Minimum 75% (currently 77.8%)
- **All new code must include tests**
- **Tests must use centralized mock factories**

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run test health check
npm run test:health-check
```

### Writing Tests

1. **Use Test Templates**
   ```bash
   cp tests/templates/unit-test-template.ts tests/unit/your-feature.test.ts
   ```

2. **Follow Testing Patterns**
   ```typescript
   import { describe, it, expect, beforeEach, afterEach } from 'vitest';
   import { MockFactoryRegistry } from '../utils/mock-factories';

   describe('YourFeature', () => {
     beforeEach(() => {
       // Setup test environment
     });

     afterEach(() => {
       MockFactoryRegistry.resetAll();
     });

     it('should behave correctly when given valid input', async () => {
       // Arrange
       const mockClient = MockFactoryRegistry.createApiClient('catalog');
       
       // Act
       const result = await yourFeature.doSomething();
       
       // Assert
       expect(result).toBeDefined();
     });
   });
   ```

3. **Use Centralized Mocks**
   ```typescript
   // ✅ Good - Use mock factory
   const mockClient = MockFactoryRegistry.createApiClient('catalog');

   // ❌ Bad - Create ad-hoc mocks
   const mockClient = { request: vi.fn() };
   ```

4. **Test Both Success and Error Cases**
   ```typescript
   describe('Error Handling', () => {
     it('should handle API errors gracefully', async () => {
       mockClient.request.mockRejectedValue(new ApiError('INVALID_REQUEST'));
       
       await expect(feature.operation()).rejects.toThrow('INVALID_REQUEST');
     });
   });
   ```

### Test Guidelines

- **Behavior-Focused**: Test what the code does, not how it does it
- **Descriptive Names**: Use clear, descriptive test names
- **Single Responsibility**: One assertion per test when possible
- **Proper Cleanup**: Always reset mocks and clean up state
- **Error Testing**: Include error scenarios and edge cases

## 📝 Code Standards

### TypeScript

- Use strict TypeScript configuration
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### File Organization

```
src/
├── api/           # Amazon SP-API clients
├── auth/          # Authentication logic
├── server/        # MCP server implementation
├── tools/         # MCP tool implementations
├── resources/     # MCP resource implementations
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── index.ts       # Main exports
```

### Commit Messages

Use conventional commit format:

```
feat: add new catalog search functionality
fix: resolve authentication token refresh issue
docs: update API documentation
test: add integration tests for orders API
refactor: improve error handling in base client
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run Quality Checks**
   ```bash
   npm run lint
   npm run format
   npm test
   npm run test:health-check
   ```

2. **Update Documentation**
   - Update README if adding new features
   - Add/update JSDoc comments
   - Update CHANGELOG.md

3. **Test Coverage**
   - Ensure new code has appropriate tests
   - Maintain coverage thresholds
   - Test both success and error scenarios

### PR Requirements

- [ ] All tests pass (`npm test`)
- [ ] Code coverage meets thresholds
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Commit messages follow conventional format

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Test improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Coverage thresholds maintained

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] CHANGELOG.md updated
```

## 🐛 Issue Guidelines

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Error messages and stack traces
- Minimal reproduction example

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed API or interface
- Examples of usage
- Consideration of breaking changes

### Questions

- Check existing documentation first
- Search existing issues
- Provide context about what you're trying to achieve
- Include relevant code examples

## 🏗️ Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `test/description` - Test improvements
- `refactor/description` - Code refactoring

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following standards
   - Add/update tests
   - Update documentation

3. **Test Changes**
   ```bash
   npm test
   npm run test:health-check
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Code coverage is checked
   - Linting and formatting verified

2. **Manual Review**
   - Code quality and standards
   - Test coverage and quality
   - Documentation completeness
   - API design and usability

3. **Feedback and Iteration**
   - Address review comments
   - Update tests and documentation
   - Ensure all checks pass

## 🎯 Areas for Contribution

### High Priority

- **API Client Improvements**: Enhance existing SP-API clients
- **Error Handling**: Improve error recovery and reporting
- **Performance**: Optimize caching and connection pooling
- **Documentation**: Improve guides and examples

### Medium Priority

- **New Features**: Additional MCP tools and resources
- **Testing**: Expand test coverage and scenarios
- **Configuration**: More flexible configuration options
- **Monitoring**: Enhanced logging and metrics

### Good First Issues

- **Documentation**: Fix typos, improve examples
- **Tests**: Add missing test cases
- **Code Quality**: Refactor for better readability
- **Examples**: Create usage examples and tutorials

## 📚 Resources

### Documentation

- [TESTING.md](./TESTING.md) - Comprehensive testing guide
- [README.md](./README.md) - Project overview and setup
- [API Documentation](./docs/api/) - Detailed API reference

### Tools and Utilities

- [Test Templates](./tests/templates/) - Boilerplate test files
- [Mock Factories](./tests/utils/mock-factories/) - Centralized mocking
- [Guidelines](./tests/guidelines/) - Testing and code patterns

### External Resources

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

## 🤔 Questions?

If you have questions about contributing:

1. Check the [documentation](./README.md)
2. Search [existing issues](https://github.com/enginterzi/amazon-seller-mcp/issues)
3. Create a new issue with the "question" label
4. Join our community discussions

Thank you for contributing to Amazon Seller MCP! 🚀
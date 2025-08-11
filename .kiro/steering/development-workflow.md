---
inclusion: always
---

# Development Workflow & Technical Debt Prevention

## Pre-Development Checklist - MANDATORY

### Before Starting Any Feature
1. **Run quality baseline check** - `npm run lint && npm test && npm run build`
2. **Check current branch status** - Ensure clean working directory
3. **Review existing patterns** - Follow established architecture in `src/`
4. **Plan testing approach** - Identify test cases before coding
5. **Verify environment setup** - All required tools and dependencies available

### Feature Development Standards
- **Create feature branch** from clean main branch
- **Write tests first** or alongside implementation (TDD/BDD approach)
- **Commit frequently** with descriptive messages
- **Run quality checks** before each commit
- **Keep changes focused** - One feature per branch

## Continuous Quality Enforcement

### Every Commit Must Pass - ZERO EXCEPTIONS
```bash
# MANDATORY pre-commit validation
npm run lint          # Zero errors allowed
npm run format        # Consistent formatting
npm test             # All tests must pass
npm run build        # Build must succeed
```

### Commit Message Standards
```
feat: add inventory update notification system
fix: resolve TypeScript strict mode violations in auth module
refactor: extract common error handling patterns
test: add integration tests for order processing
docs: update API documentation for catalog endpoints
```

### Branch Protection Rules
- **No direct commits to main** - All changes via pull requests
- **Require status checks** - CI must pass before merge
- **Require code review** - At least one approval required
- **Enforce linear history** - Use squash and merge

## Technical Debt Prevention

### Daily Development Practices
- **Clean as you go** - Remove unused code immediately
- **Fix lint warnings** - Don't accumulate technical debt
- **Update tests** - Keep tests aligned with code changes
- **Document decisions** - Add comments for complex logic
- **Refactor incrementally** - Improve code structure continuously

### Weekly Quality Reviews
```typescript
// Weekly checklist - Run these commands and review results
npm run lint                    // Should show zero issues
npm test -- --coverage        // Should maintain >80% coverage
npm run build                  // Should complete without warnings
git log --oneline -10          // Review recent commit quality
```

### Monthly Technical Debt Assessment
- **Review lint baseline** - Ensure no regression
- **Analyze test pass rates** - Should maintain >95%
- **Check dependency updates** - Keep dependencies current
- **Review code complexity** - Identify refactoring opportunities
- **Assess performance metrics** - Monitor for degradation

## Code Review Standards

### Reviewer Responsibilities - MANDATORY CHECKS
1. **Type safety verification** - No `any` types, proper interfaces
2. **Import cleanliness** - No unused imports, proper organization
3. **Error handling review** - Proper error types and handling patterns
4. **Test coverage validation** - New code has appropriate tests
5. **Architecture compliance** - Follows established patterns
6. **Security review** - Credential handling, input validation
7. **Performance considerations** - No obvious bottlenecks

### Review Checklist Template
```markdown
## Code Review Checklist

### Quality Gates
- [ ] Zero lint errors (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript `any` types used
- [ ] No unused imports or variables

### Architecture & Patterns
- [ ] Follows established directory structure
- [ ] Uses appropriate abstraction layers
- [ ] Implements proper error handling
- [ ] Uses centralized mock factories in tests
- [ ] Follows naming conventions

### Security & Performance
- [ ] No exposed credentials or sensitive data
- [ ] Proper input validation with Zod schemas
- [ ] Uses connection pooling and caching appropriately
- [ ] No memory leaks or resource cleanup issues

### Documentation & Testing
- [ ] Public APIs have JSDoc comments
- [ ] Tests cover happy path and error scenarios
- [ ] Test descriptions are behavior-focused
- [ ] Integration tests mock external dependencies
```

## Automated Quality Enforcement

### GitHub Actions Workflow Requirements
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates
on: [push, pull_request]
jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint          # Must pass
      - run: npm run format        # Must be formatted
      - run: npm test             # Must pass with coverage
      - run: npm run build        # Must build successfully
```

### Pre-commit Hook Setup
```bash
#!/bin/sh
# .git/hooks/pre-commit - Automatically installed
echo "🔍 Running quality checks..."

# Lint check
if ! npm run lint; then
  echo "❌ Lint errors found. Fix them before committing."
  exit 1
fi

# Format check
if ! npm run format; then
  echo "❌ Formatting issues found. Run 'npm run format' to fix."
  exit 1
fi

# Test check
if ! npm test; then
  echo "❌ Tests failing. Fix them before committing."
  exit 1
fi

# Build check
if ! npm run build; then
  echo "❌ Build failing. Fix compilation errors before committing."
  exit 1
fi

echo "✅ All quality gates passed. Proceeding with commit."
```

## Emergency Procedures

### When Quality Gates Fail
1. **STOP development immediately** - Don't proceed with failing builds
2. **Identify root cause** - Use lint output, test results, build logs
3. **Fix systematically** - Address errors by category (types, imports, tests)
4. **Validate fixes locally** - Run full quality check suite
5. **Document lessons learned** - Update steering rules if needed

### Technical Debt Escalation
- **Yellow Alert** (>10 lint warnings): Schedule cleanup within 1 week
- **Orange Alert** (>50 lint warnings): Stop feature development, focus on cleanup
- **Red Alert** (>100 lint warnings): Emergency cleanup sprint required

### Recovery Procedures
```bash
# Emergency quality recovery script
echo "🚨 Emergency quality recovery initiated..."

# 1. Capture current state
npm run lint > lint-issues.log 2>&1
npm test > test-results.log 2>&1

# 2. Apply automatic fixes
npm run lint -- --fix
npm run format

# 3. Validate recovery
if npm run lint && npm test && npm run build; then
  echo "✅ Quality recovery successful"
else
  echo "❌ Manual intervention required"
  echo "Check lint-issues.log and test-results.log for details"
fi
```

## Long-term Sustainability

### Quarterly Architecture Reviews
- **Evaluate patterns and practices** - Are they still serving us well?
- **Review technical debt trends** - Are we accumulating or reducing debt?
- **Assess tool effectiveness** - Are our quality tools working?
- **Plan improvements** - What can we do better next quarter?

### Annual Quality Assessment
- **Comprehensive codebase health check** - Full audit of code quality
- **Developer productivity analysis** - How much time spent on quality issues?
- **Tool and process evaluation** - What's working, what needs improvement?
- **Strategic planning** - Quality goals for the next year

### Knowledge Sharing
- **Document quality wins** - Share successful patterns and practices
- **Learn from quality failures** - Analyze what went wrong and why
- **Train team members** - Ensure everyone understands quality standards
- **Celebrate quality improvements** - Recognize good quality practices

## Success Metrics

### Daily Metrics
- **Lint errors**: 0 (zero tolerance)
- **Test pass rate**: >95%
- **Build success rate**: 100%
- **Code coverage**: >80% line, >75% branch

### Weekly Metrics
- **Technical debt trend**: Decreasing or stable
- **Code review turnaround**: <24 hours
- **Quality gate failures**: <5% of commits
- **Developer satisfaction**: Regular team feedback

### Monthly Metrics
- **Codebase health score**: Improving trend
- **Time spent on quality issues**: Decreasing
- **Feature delivery velocity**: Stable or improving
- **Production bug rate**: Low and stable

Remember: **Quality is everyone's responsibility**. These workflows exist to prevent the massive technical debt that required an 11,937-line cleanup. Follow them consistently to maintain a healthy, productive development environment.
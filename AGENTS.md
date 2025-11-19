# AGENTS.md

This document is automatically updated by PR review comments.

## Overview

This file tracks information about AI agents, automated processes, and agent-related patterns discussed in PR reviews.

## Agent Patterns

### GitHub Actions Default Values

When creating GitHub Actions, always allow action.yml defaults to apply by not specifying parameters in workflows that would simply match the default values. This prevents issues where empty string values override defaults and cause validation errors.

**Example Pattern:**
- ❌ Bad: Passing empty string values that override action.yml defaults
- ✅ Good: Omitting parameters entirely to let action.yml defaults apply

This is particularly important for optional parameters like `model` and `doc-file` where GitHub variables may evaluate to empty strings when not set.

## Best Practices

### Code Quality and Tooling

1. **Use standard libraries and frameworks** - Whenever possible, leverage existing libraries or frameworks rather than writing bespoke solutions to standard problems. This improves maintainability and reliability.

2. **Automated code formatting** - Always use tools like Biome to keep code consistently formatted (e.g., keeping imports sorted automatically).

3. **String quoting consistency** - In this project, always use double quotes for strings to maintain consistency across the codebase.

## Notes

These patterns and practices help ensure that automated agents and workflows behave predictably and maintainably within the project.
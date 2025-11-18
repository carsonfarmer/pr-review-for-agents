# PR Review to Docs Action

Automatically updates your documentation files (like `AGENTS.md`) based on PR review comments using AI. This action uses Claude (via the Vercel AI SDK) to intelligently incorporate review feedback into your documentation, keeping it synchronized with code changes and discussions.

## Features

- 🤖 Uses Claude AI to understand and incorporate review feedback
- 📝 Preserves existing documentation while adding new insights
- 🔄 Prevents infinite loops by skipping PRs that modify the doc file
- ⚡ Efficient with conditional step execution
- 🎨 Configurable model and documentation file
- 🔒 Secure with proper permission handling

## Setup

### 1. Add the workflow to your repository

Create `.github/workflows/pr-review-to-docs.yml`:

```yaml
name: Update AGENTS.md from PR review

on:
  pull_request_review:
    types: [submitted]

jobs:
  update-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          fetch-depth: 0

      - name: Update AGENTS.md from PR review
        uses: carsonfarmer/pr-review-for-agents@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: 'claude-sonnet-4-5-20250929'  # Optional: defaults to this
          doc-file: 'AGENTS.md'  # Optional: defaults to this
```

### 2. Configure secrets

Add your Anthropic API key to your repository secrets:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key from https://console.anthropic.com/

### 3. Ensure GitHub Actions has write permissions

- Go to Settings → Actions → General
- Under "Workflow permissions", select "Read and write permissions"

### 4. Create your documentation file

Create an `AGENTS.md` file (or your chosen doc file) in your repository root. The action will update this file based on PR review comments.

Example `AGENTS.md` template:

```markdown
# AGENTS.md

This document tracks information about AI agents, automated processes, and agent-related patterns discussed in PR reviews.

## Overview

(This section will be populated based on PR review comments)

## Implementation Details

(This section will be populated based on PR review comments)

## Configuration

(This section will be populated based on PR review comments)
```

## Usage

Once set up, the action will automatically run when:
- Someone submits a PR review (approved, commented, or requested changes)
- The PR does NOT modify the documentation file itself (to prevent loops)

The action will:
1. Gather all review comments (both inline and overall)
2. Send them to Claude along with the current documentation
3. Generate updated documentation that incorporates the feedback
4. Commit and push the changes back to the PR branch

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `anthropic-api-key` | Anthropic API key for Claude | Yes | - |
| `model` | Claude model to use | No | `claude-sonnet-4-5-20250929` |
| `doc-file` | Documentation file to update | No | `AGENTS.md` |

## Customization

### Using a different model

You can use any Claude model by specifying the `model` input:

```yaml
- uses: carsonfarmer/pr-review-for-agents@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    model: 'claude-3-opus-20240229'
```

Or set it as a repository variable:

1. Go to Settings → Secrets and variables → Actions → Variables
2. Add `LLM_MODEL` with your preferred model name
3. Use it in the workflow:

```yaml
model: ${{ vars.LLM_MODEL || 'claude-sonnet-4-5-20250929' }}
```

### Using a different documentation file

```yaml
- uses: carsonfarmer/pr-review-for-agents@v1
  with:
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    doc-file: 'ARCHITECTURE.md'
```

## How it works

1. **Trigger**: Action runs on PR review submission
2. **Check**: Verifies the PR doesn't modify the doc file (prevents loops)
3. **Gather**: Collects all PR review comments and current documentation
4. **Generate**: Sends context to Claude with instructions to:
   - Preserve existing functionality and requirements
   - Add insights from review comments
   - Maintain documentation structure
5. **Update**: Writes the updated documentation
6. **Commit**: Pushes changes back to the PR branch

## Loop Prevention

The action automatically skips execution if the PR modifies the documentation file. This prevents an infinite loop where:
- PR updates docs → review triggers action → action updates docs → new commit gets reviewed → repeat

## Local Development

To test changes to this action locally:

1. Make your changes to the action files
2. Use the workflow in this repo (`.github/workflows/pr-review-to-docs.yml`) which uses `uses: ./` to test locally
3. Create a PR and submit a review to trigger the action

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your projects!

## Credits

Built with:
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Anthropic Claude](https://www.anthropic.com/)
- [Octokit](https://github.com/octokit/octokit.js)

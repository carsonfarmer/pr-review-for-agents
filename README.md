# PR Review to Documentation

This repository automatically updates documentation files (AGENTS.md and CLAUDE.md) based on PR review comments using an LLM.

## Setup

1. **Set up the LLM API Key secret:**
   - Go to your GitHub repository settings
   - Navigate to Secrets and Variables → Actions
   - Add a new repository secret named `LLM_API_KEY`
   - Paste your OpenAI API key (or other LLM provider key)

2. **Ensure GitHub Actions has write permissions:**
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## How It Works

1. When a PR review is submitted, the GitHub Action is triggered
2. The action fetches all review comments (both inline and overall reviews)
3. It sends the comments along with the PR context to an LLM
4. The LLM generates updated content for AGENTS.md and CLAUDE.md
5. The changes are committed and pushed back to the PR branch

## Configuration

### Using a Different LLM Provider

The script uses OpenAI by default, but you can modify `.github/scripts/update-docs-from-review.js` to use other providers:

- **Anthropic Claude:** Replace OpenAI client with Anthropic client
- **Azure OpenAI:** Configure OpenAI client with Azure endpoint
- **Local LLM:** Point to your local endpoint

### Customizing Documentation Files

Edit the system prompt in `.github/scripts/update-docs-from-review.js` to change how the LLM generates documentation.

## Files

- `.github/workflows/pr-review-to-docs.yml` - GitHub Actions workflow
- `.github/scripts/update-docs-from-review.js` - Script that processes reviews and calls LLM
- `AGENTS.md` - Documentation about AI agents
- `CLAUDE.md` - Documentation about Claude AI

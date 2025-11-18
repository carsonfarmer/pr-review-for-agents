const { Octokit } = require('@octokit/rest');
const { generateText } = require('ai');
const { anthropic } = require('@ai-sdk/anthropic');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  // Initialize clients
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  // Configure model
  const modelName = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';

  const [owner, repo] = process.env.REPOSITORY.split('/');
  const prNumber = parseInt(process.env.PR_NUMBER);

  console.log(`Processing PR #${prNumber} in ${owner}/${repo}`);

  // Fetch PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  });

  // Fetch all review comments (inline comments)
  const { data: reviewComments } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber
  });

  // Fetch all reviews (overall review comments)
  const { data: reviews } = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber
  });

  // Compile all comments
  const allComments = [];

  // Add review-level comments
  reviews.forEach(review => {
    if (review.body) {
      allComments.push({
        type: 'review',
        author: review.user.login,
        state: review.state,
        body: review.body,
        submitted_at: review.submitted_at
      });
    }
  });

  // Add inline review comments
  reviewComments.forEach(comment => {
    allComments.push({
      type: 'inline',
      author: comment.user.login,
      path: comment.path,
      line: comment.line,
      body: comment.body,
      created_at: comment.created_at
    });
  });

  console.log(`Found ${allComments.length} comments total`);

  if (allComments.length === 0) {
    console.log('No comments to process');
    return;
  }

  // Read existing AGENTS.md if it exists
  let existingAgents = '';

  try {
    existingAgents = await fs.readFile('AGENTS.md', 'utf-8');
  } catch (error) {
    console.log('AGENTS.md does not exist yet');
  }

  // Prepare context for LLM
  const prContext = `
PR Title: ${pr.title}
PR Description: ${pr.body || 'No description provided'}
PR Author: ${pr.user.login}

Review Comments (${allComments.length} total):
${allComments.map((comment, idx) => `
Comment ${idx + 1}:
  Type: ${comment.type}
  Author: ${comment.author}
  ${comment.state ? `State: ${comment.state}` : ''}
  ${comment.path ? `File: ${comment.path} (Line ${comment.line})` : ''}
  Body: ${comment.body}
`).join('\n')}
`;

  const existingDocsContext = `
Current AGENTS.md:
${existingAgents || '(Empty - needs to be created)'}
`;

  // Call LLM to generate updated documentation
  console.log('Calling LLM to generate documentation...');

  const { text } = await generateText({
    model: anthropic(modelName),
    temperature: 0.7,
    system: `You are a documentation assistant. Your job is to update or create the AGENTS.md documentation file based on PR review comments.

AGENTS.md should contain information about AI agents, automated processes, agent-related patterns, or agent implementation details discussed in the PR reviews.

IMPORTANT: When updating the documentation, preserve all existing functionality, requirements, and instructions. Only add or clarify based on the review comments - never remove or reduce existing content unless explicitly requested in the comments.

You must respond with a JSON object in the following format:
{
  "agents_md": "Full content for AGENTS.md file"
}

If the review comments don't contain relevant information, you can use the existing content or update it minimally.`,
    prompt: `Please update the AGENTS.md documentation based on these PR review comments:

${prContext}

Existing documentation:
${existingDocsContext}

Generate updated content for AGENTS.md that incorporates insights from the review comments.`
  });

  const response = JSON.parse(text);

  // Write updated file
  await fs.writeFile('AGENTS.md', response.agents_md);
  console.log('✓ Updated AGENTS.md');

  console.log('Documentation update complete!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

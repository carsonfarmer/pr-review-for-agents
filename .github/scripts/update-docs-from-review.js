const { Octokit } = require('@octokit/rest');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  // Initialize clients
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const openai = new OpenAI({
    apiKey: process.env.LLM_API_KEY
  });

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

  // Read existing docs if they exist
  let existingAgents = '';
  let existingClaude = '';

  try {
    existingAgents = await fs.readFile('AGENTS.md', 'utf-8');
  } catch (error) {
    console.log('AGENTS.md does not exist yet');
  }

  try {
    existingClaude = await fs.readFile('CLAUDE.md', 'utf-8');
  } catch (error) {
    console.log('CLAUDE.md does not exist yet');
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

Current CLAUDE.md:
${existingClaude || '(Empty - needs to be created)'}
`;

  // Call LLM to generate updated documentation
  console.log('Calling LLM to generate documentation...');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a documentation assistant. Your job is to update or create two documentation files (AGENTS.md and CLAUDE.md) based on PR review comments.

AGENTS.md should contain information about AI agents, automated processes, or agent-related patterns discussed in the PR reviews.

CLAUDE.md should contain information about Claude AI usage, Claude-specific instructions, or Claude integration details discussed in the PR reviews.

You must respond with a JSON object in the following format:
{
  "agents_md": "Full content for AGENTS.md file",
  "claude_md": "Full content for CLAUDE.md file"
}

If the review comments don't contain relevant information for one of the files, you can use the existing content or create a minimal placeholder explaining what the file is for.`
      },
      {
        role: 'user',
        content: `Please update the documentation files based on these PR review comments:

${prContext}

Existing documentation:
${existingDocsContext}

Generate updated content for both AGENTS.md and CLAUDE.md that incorporates insights from the review comments.`
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  const response = JSON.parse(completion.choices[0].message.content);

  // Write updated files
  await fs.writeFile('AGENTS.md', response.agents_md);
  console.log('✓ Updated AGENTS.md');

  await fs.writeFile('CLAUDE.md', response.claude_md);
  console.log('✓ Updated CLAUDE.md');

  console.log('Documentation update complete!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

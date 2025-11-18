import { anthropic } from "@ai-sdk/anthropic";
import { Octokit } from "@octokit/rest";
import { generateText } from "ai";
import { readFile, writeFile } from "fs/promises";

async function main() {
  // Initialize clients
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // Configure model and doc file
  const modelName = process.env.LLM_MODEL;
  const docFile = process.env.DOC_FILE;

  const [owner, repo] = process.env.REPOSITORY.split("/");
  const prNumber = parseInt(process.env.PR_NUMBER, 10);

  console.log(`Processing PR #${prNumber} in ${owner}/${repo}`);
  console.log(`Updating documentation file: ${docFile}`);

  // Fetch PR details
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Fetch all review comments (inline comments)
  const { data: reviewComments } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Fetch all reviews (overall review comments)
  const { data: reviews } = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Compile all comments
  const allComments = [];

  // Add review-level comments
  reviews.forEach((review) => {
    if (review.body) {
      allComments.push({
        type: "review",
        author: review.user.login,
        state: review.state,
        body: review.body,
        submitted_at: review.submitted_at,
      });
    }
  });

  // Add inline review comments
  reviewComments.forEach((comment) => {
    allComments.push({
      type: "inline",
      author: comment.user.login,
      path: comment.path,
      line: comment.line,
      body: comment.body,
      created_at: comment.created_at,
    });
  });

  console.log(`Found ${allComments.length} comments total`);

  if (allComments.length === 0) {
    console.log("No comments to process");
    return;
  }

  // Read existing doc file if it exists
  let existingContent = "";

  try {
    existingContent = await readFile(docFile, "utf-8");
  } catch (_error) {
    console.log(`${docFile} does not exist yet`);
  }

  // Prepare context for LLM
  const prContext = `
PR Title: ${pr.title}
PR Description: ${pr.body || "No description provided"}
PR Author: ${pr.user.login}

Review Comments (${allComments.length} total):
${allComments
  .map(
    (comment, idx) => `
Comment ${idx + 1}:
  Type: ${comment.type}
  Author: ${comment.author}
  ${comment.state ? `State: ${comment.state}` : ""}
  ${comment.path ? `File: ${comment.path} (Line ${comment.line})` : ""}
  Body: ${comment.body}
`,
  )
  .join("\n")}
`;

  const existingDocsContext = `
Current ${docFile}:
${existingContent || "(Empty - needs to be created)"}
`;

  // Call LLM to generate updated documentation
  console.log("Calling LLM to generate documentation...");

  const { text } = await generateText({
    model: anthropic(modelName),
    temperature: 0.7,
    system: `You are a documentation assistant. Your job is to update or create the ${docFile} documentation file based on PR review comments.

${docFile} should contain information about AI agents, automated processes, agent-related patterns, or agent implementation details discussed in the PR reviews.

IMPORTANT:
- When updating the documentation, preserve all existing functionality, requirements, and instructions.
- Only add or clarify based on the review comments - never remove or reduce existing content unless explicitly requested in the comments.
- If the review comments don't contain relevant information for this documentation file, return an empty response (no text at all).
- Return the full updated content of the ${docFile} file as plain text (not JSON).`,
    prompt: `Please update the ${docFile} documentation based on these PR review comments:

${prContext}

Existing documentation:
${existingDocsContext}

Generate the full updated content for ${docFile} that incorporates insights from the review comments. If the review comments don't contain information relevant to ${docFile}, return empty text.`,
  });

  // Check if update is needed
  if (!text || text.trim() === "") {
    console.log(`No relevant changes for ${docFile} - skipping update`);
    return;
  }

  // Check if content actually changed
  if (text === existingContent) {
    console.log(`Content unchanged for ${docFile} - skipping update`);
    return;
  }

  // Write updated file
  await writeFile(docFile, text);
  console.log(`✓ Updated ${docFile}`);

  console.log("Documentation update complete!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

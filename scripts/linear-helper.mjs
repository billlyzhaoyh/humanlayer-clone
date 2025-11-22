#!/usr/bin/env node

/**
 * Linear Helper - Simplified Linear API integration for GitHub Actions workflows
 *
 * Commands:
 *   list-issues --status <status> [--assignee <name>] [--limit <n>]
 *   get-issue <issue-id> [--output json|text]
 *   update-status <issue-id> <status>
 *   add-comment <issue-id> <comment>
 *   add-link <issue-id> <url> [--title <title>]
 *   download-images <issue-id> [--output-dir <dir>]
 *   setup-workflow [--team <team-name>]
 */

import { LinearClient } from '@linear/sdk';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Linear client
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error('Error: LINEAR_API_KEY environment variable is required');
  process.exit(1);
}

const linear = new LinearClient({ apiKey });

/**
 * List issues filtered by status and optionally assignee
 */
async function listIssues(options) {
  const { status, assignee, limit = 10 } = options;

  try {
    // Build filter
    const filter = {};

    if (status) {
      // Find workflow state by name
      const states = await linear.workflowStates();
      const state = states.nodes.find(s =>
        s.name.toLowerCase() === status.toLowerCase()
      );
      if (state) {
        filter.state = { id: { eq: state.id } };
      } else {
        console.error(`Warning: Status "${status}" not found`);
      }
    }

    if (assignee) {
      // Find user by display name
      const users = await linear.users();
      const user = users.nodes.find(u =>
        u.displayName.toLowerCase().includes(assignee.toLowerCase()) ||
        u.name.toLowerCase().includes(assignee.toLowerCase())
      );
      if (user) {
        filter.assignee = { id: { eq: user.id } };
      } else {
        console.error(`Warning: Assignee "${assignee}" not found`);
      }
    }

    // Convert limit to integer (GraphQL requires Int type, not String)
    const limitInt = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // Fetch issues
    const issues = await linear.issues({
      filter,
      first: limitInt,
      orderBy: 'updatedAt'
    });

    // Format output
    const result = issues.nodes.map(issue => ({
      id: issue.identifier,
      title: issue.title,
      status: issue.state?.name,
      assignee: issue.assignee?.displayName,
      url: issue.url,
      branchName: issue.branchName,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    }));

    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error listing issues:', error.message);
    process.exit(1);
  }
}

/**
 * Get detailed information about a specific issue
 */
async function getIssue(issueId, options = {}) {
  const { output = 'json' } = options;

  try {
    const issue = await linear.issue(issueId);

    if (!issue) {
      console.error(`Error: Issue ${issueId} not found`);
      process.exit(1);
    }

    // Get comments
    const comments = await issue.comments();

    // Get parent issue if exists
    let parent = null;
    if (issue.parent) {
      parent = await issue.parent;
    }

    // Get attachments
    const attachments = await issue.attachments();

    const result = {
      id: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: issue.state?.name,
      assignee: issue.assignee?.displayName,
      url: issue.url,
      branchName: issue.branchName,
      priority: issue.priority,
      estimate: issue.estimate,
      labels: issue.labels ? await issue.labels().then(l => l.nodes.map(n => n.name)) : [],
      parent: parent ? {
        id: parent.identifier,
        title: parent.title,
        url: parent.url
      } : null,
      comments: comments.nodes.map(c => ({
        user: c.user?.displayName,
        body: c.body,
        createdAt: c.createdAt
      })),
      attachments: attachments.nodes.map(a => ({
        title: a.title,
        url: a.url,
        subtitle: a.subtitle
      })),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    };

    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Text format for easy reading
      console.log(`# ${result.id}: ${result.title}\n`);
      console.log(`**Status**: ${result.status}`);
      console.log(`**Assignee**: ${result.assignee || 'Unassigned'}`);
      console.log(`**URL**: ${result.url}`);
      if (result.branchName) console.log(`**Branch**: ${result.branchName}`);
      if (result.parent) console.log(`**Parent**: ${result.parent.id} - ${result.parent.title}`);
      console.log(`\n## Description\n${result.description || '(No description)'}\n`);

      if (result.comments.length > 0) {
        console.log(`## Comments (${result.comments.length})\n`);
        result.comments.forEach((c, i) => {
          console.log(`### Comment ${i + 1} by ${c.user} (${c.createdAt})`);
          console.log(c.body);
          console.log('');
        });
      }

      if (result.attachments.length > 0) {
        console.log(`## Attachments (${result.attachments.length})\n`);
        result.attachments.forEach(a => {
          console.log(`- ${a.title}: ${a.url}`);
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting issue:', error.message);
    process.exit(1);
  }
}

/**
 * Update issue status
 */
async function updateStatus(issueId, newStatus) {
  try {
    const issue = await linear.issue(issueId);

    if (!issue) {
      console.error(`Error: Issue ${issueId} not found`);
      process.exit(1);
    }

    // Find workflow state by name
    const states = await linear.workflowStates();
    const state = states.nodes.find(s =>
      s.name.toLowerCase() === newStatus.toLowerCase()
    );

    if (!state) {
      console.error(`Error: Status "${newStatus}" not found`);
      console.error('Available statuses:', states.nodes.map(s => s.name).join(', '));
      process.exit(1);
    }

    await issue.update({ stateId: state.id });

    console.log(`✓ Updated ${issueId} status to "${state.name}"`);
  } catch (error) {
    console.error('Error updating status:', error.message);
    process.exit(1);
  }
}

/**
 * Add comment to issue
 */
async function addComment(issueId, commentBody) {
  try {
    const issue = await linear.issue(issueId);

    if (!issue) {
      console.error(`Error: Issue ${issueId} not found`);
      process.exit(1);
    }

    // Use Linear SDK v2 mutation helper
    // The SDK provides mutation helpers through the client
    const result = await linear.client.request(`
      mutation CommentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
          }
        }
      }
    `, {
      input: {
        issueId: issue.id,
        body: commentBody
      }
    });

    if (!result.commentCreate?.success) {
      throw new Error('Failed to create comment');
    }

    console.log(`✓ Added comment to ${issueId}`);
  } catch (error) {
    console.error('Error adding comment:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

/**
 * Add link to issue
 */
async function addLink(issueId, url, title = null) {
  try {
    const issue = await linear.issue(issueId);

    if (!issue) {
      console.error(`Error: Issue ${issueId} not found`);
      process.exit(1);
    }

    const mutation = `
      mutation AttachmentCreate($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) {
          success
          attachment {
            id
            url
          }
        }
      }
    `;

    const variables = {
      input: {
        issueId: issue.id,
        url,
        title: title || url,
        subtitle: 'GitHub Pull Request'
      }
    };

    const result = await linear.client.request(mutation, variables);

    if (!result.attachmentCreate?.success) {
      throw new Error('Failed to add link');
    }

    console.log(`✓ Added link to ${issueId}: ${url}`);
  } catch (error) {
    console.error('Error adding link:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

/**
 * Download all images from issue attachments
 */
async function downloadImages(issueId, options = {}) {
  const { outputDir = 'thoughts/shared/images' } = options;

  try {
    const issue = await linear.issue(issueId);

    if (!issue) {
      console.error(`Error: Issue ${issueId} not found`);
      process.exit(1);
    }

    const attachments = await issue.attachments();
    const imageAttachments = attachments.nodes.filter(a =>
      a.url && (a.url.includes('linear.app') || a.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
    );

    if (imageAttachments.length === 0) {
      console.log(`No images found for ${issueId}`);
      return;
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Downloading ${imageAttachments.length} images for ${issueId}...`);

    for (const attachment of imageAttachments) {
      try {
        // Generate filename from title or URL
        const filename = attachment.title
          ? `${issueId}-${attachment.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`
          : `${issueId}-${Date.now()}.jpg`;

        const filepath = join(outputDir, filename);

        // Download image
        const response = await fetch(attachment.url);
        if (!response.ok) {
          console.error(`Failed to download ${attachment.url}: ${response.statusText}`);
          continue;
        }

        const buffer = await response.arrayBuffer();
        await fs.writeFile(filepath, Buffer.from(buffer));

        console.log(`✓ Downloaded: ${filename}`);
      } catch (err) {
        console.error(`Error downloading ${attachment.url}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error downloading images:', error.message);
    process.exit(1);
  }
}

/**
 * Setup Linear workflow with required states for automation
 */
async function setupWorkflow(options = {}) {
  const { team: teamName } = options;

  try {
    console.log('🔧 Setting up Linear workflow for humanlayer-clone automation...\n');

    // Get teams
    const teams = await linear.teams();

    let selectedTeam;
    if (teamName) {
      selectedTeam = teams.nodes.find(t =>
        t.name.toLowerCase().includes(teamName.toLowerCase()) ||
        t.key.toLowerCase() === teamName.toLowerCase()
      );
      if (!selectedTeam) {
        console.error(`Error: Team "${teamName}" not found`);
        console.log('Available teams:', teams.nodes.map(t => `${t.name} (${t.key})`).join(', '));
        process.exit(1);
      }
    } else {
      // Use first team if only one exists, otherwise prompt
      if (teams.nodes.length === 1) {
        selectedTeam = teams.nodes[0];
      } else {
        console.log('Multiple teams found. Please specify one with --team flag:');
        teams.nodes.forEach(t => console.log(`  - ${t.name} (${t.key})`));
        process.exit(1);
      }
    }

    console.log(`Using team: ${selectedTeam.name} (${selectedTeam.key})\n`);

    // Get existing workflow states for this team
    const existingStates = await linear.workflowStates({
      filter: { team: { id: { eq: selectedTeam.id } } }
    });

    const existingStateNames = new Set(existingStates.nodes.map(s => s.name.toLowerCase()));

    // Define required workflow states in order
    const requiredStates = [
      // Research phase
      { name: 'Research Needed', type: 'unstarted', color: '#e2e2e2', description: 'Ticket needs codebase research before planning' },
      { name: 'Research in Progress', type: 'started', color: '#f2c94c', description: 'Research workflow is running' },
      { name: 'Research in Review', type: 'started', color: '#f2994a', description: 'Research complete, awaiting approval' },

      // Planning phase
      { name: 'Ready for Plan', type: 'unstarted', color: '#5e6ad2', description: 'Research approved, ready for implementation planning' },
      { name: 'Plan in Progress', type: 'started', color: '#26b5ce', description: 'Planning workflow is running' },
      { name: 'Plan in Review', type: 'started', color: '#0f83ab', description: 'Plan complete, awaiting approval' },

      // Implementation phase
      { name: 'Ready for Dev', type: 'unstarted', color: '#4ea7fc', description: 'Plan approved, ready for implementation' },
      { name: 'In Dev', type: 'started', color: '#a358df', description: 'Implementation workflow is running' },
      { name: 'Code Review', type: 'started', color: '#ab4acd', description: 'PR created, awaiting review' },
    ];

    console.log('Creating workflow states...\n');

    const createdStates = [];
    const skippedStates = [];

    for (const stateConfig of requiredStates) {
      // Check if state already exists (case-insensitive)
      if (existingStateNames.has(stateConfig.name.toLowerCase())) {
        console.log(`⏭️  Skipped: "${stateConfig.name}" (already exists)`);
        skippedStates.push(stateConfig.name);
        continue;
      }

      try {
        const result = await linear.workflowStateCreate({
          name: stateConfig.name,
          teamId: selectedTeam.id,
          type: stateConfig.type,
          color: stateConfig.color,
          description: stateConfig.description
        });

        console.log(`✓ Created: "${stateConfig.name}" (${stateConfig.type})`);
        createdStates.push(stateConfig.name);
      } catch (err) {
        console.error(`✗ Failed to create "${stateConfig.name}": ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Workflow Setup Complete!\n');

    if (createdStates.length > 0) {
      console.log(`✓ Created ${createdStates.length} new states:`);
      createdStates.forEach(name => console.log(`  - ${name}`));
      console.log('');
    }

    if (skippedStates.length > 0) {
      console.log(`⏭️  Skipped ${skippedStates.length} existing states:`);
      skippedStates.forEach(name => console.log(`  - ${name}`));
      console.log('');
    }

    console.log('Next steps:');
    console.log('1. Create or assign the "LinearLayer (Claude)" user/bot in Linear');
    console.log('2. Assign tickets to this bot with status "Research Needed"');
    console.log('3. Run GitHub workflow: gh workflow run linear-research-tickets.yml');
    console.log('');
    console.log('View all states: node scripts/linear-helper.mjs list-states');

  } catch (error) {
    console.error('Error setting up workflow:', error.message);
    process.exit(1);
  }
}

/**
 * List all workflow states
 */
async function listStates(options = {}) {
  const { team: teamName } = options;

  try {
    let filter = {};

    if (teamName) {
      const teams = await linear.teams();
      const team = teams.nodes.find(t =>
        t.name.toLowerCase().includes(teamName.toLowerCase()) ||
        t.key.toLowerCase() === teamName.toLowerCase()
      );

      if (team) {
        filter = { team: { id: { eq: team.id } } };
        console.log(`Workflow states for team: ${team.name} (${team.key})\n`);
      } else {
        console.error(`Warning: Team "${teamName}" not found, showing all states\n`);
      }
    } else {
      console.log('All workflow states:\n');
    }

    const states = await linear.workflowStates({ filter });

    // Group by team
    const statesByTeam = {};
    for (const state of states.nodes) {
      const team = await state.team;
      const teamKey = team ? team.name : 'Unknown Team';

      if (!statesByTeam[teamKey]) {
        statesByTeam[teamKey] = [];
      }

      statesByTeam[teamKey].push({
        name: state.name,
        type: state.type,
        position: state.position,
        description: state.description
      });
    }

    // Print states by team
    for (const [teamName, teamStates] of Object.entries(statesByTeam)) {
      console.log(`📋 ${teamName}:`);
      teamStates
        .sort((a, b) => a.position - b.position)
        .forEach(state => {
          console.log(`  ${state.position + 1}. ${state.name} (${state.type})`);
          if (state.description) {
            console.log(`     ${state.description}`);
          }
        });
      console.log('');
    }

  } catch (error) {
    console.error('Error listing states:', error.message);
    process.exit(1);
  }
}

// CLI Argument Parser
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Linear Helper - CLI for Linear API operations

Usage: linear-helper.mjs <command> [options]

Commands:
  setup-workflow [--team <team-name>]     Setup workflow states for automation
  list-states [--team <team-name>]        List all workflow states
  list-issues --status <status> [--assignee <name>] [--limit <n>]
  get-issue <issue-id> [--output json|text]
  update-status <issue-id> <status>
  add-comment <issue-id> <comment>
  add-link <issue-id> <url> [--title <title>]
  download-images <issue-id> [--output-dir <dir>]

Environment Variables:
  LINEAR_API_KEY - Required Linear API key
    `);
    process.exit(1);
  }

  const command = args[0];
  const options = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      options[key] = value;
      i++; // Skip next arg
    } else {
      positional.push(args[i]);
    }
  }

  return { command, options, positional };
}

// Main execution
async function main() {
  const { command, options, positional } = parseArgs();

  try {
    switch (command) {
      case 'setup-workflow':
        await setupWorkflow(options);
        break;

      case 'list-states':
        await listStates(options);
        break;

      case 'list-issues':
        await listIssues(options);
        break;

      case 'get-issue':
        if (positional.length === 0) {
          console.error('Error: Issue ID required');
          process.exit(1);
        }
        await getIssue(positional[0], options);
        break;

      case 'update-status':
        if (positional.length < 2) {
          console.error('Error: Issue ID and status required');
          process.exit(1);
        }
        await updateStatus(positional[0], positional[1]);
        break;

      case 'add-comment':
        if (positional.length < 2) {
          console.error('Error: Issue ID and comment required');
          process.exit(1);
        }
        await addComment(positional[0], positional.slice(1).join(' '));
        break;

      case 'add-link':
        if (positional.length < 2) {
          console.error('Error: Issue ID and URL required');
          process.exit(1);
        }
        await addLink(positional[0], positional[1], options.title);
        break;

      case 'download-images':
        if (positional.length === 0) {
          console.error('Error: Issue ID required');
          process.exit(1);
        }
        await downloadImages(positional[0], options);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

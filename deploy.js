import { execSync } from 'child_process';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${cmd}\nError: ${error.stderr || error.message}`);
  }
}

async function main() {
  console.log('=== Starting Deployment Script ===');
  
  // 1. Get current commit hash (before any new commits/pushes)
  let currentCommit = '';
  try {
    currentCommit = run('git rev-parse HEAD');
    console.log(`Current git commitment: ${currentCommit}`);
  } catch (e) {
    console.error('Error getting current git commitment. Make sure you are in a git repository.');
    process.exit(1);
  }

  // 2. Create backup tag for the last git commitment
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, '-').replace(/:/g, '-').split('.')[0];
  const tagName = `backup-deploy-${timestamp}`;
  
  console.log(`Backing up last git commitment: creating tag ${tagName}...`);
  try {
    run(`git tag -a ${tagName} -m "Backup before deploy at ${timestamp}"`);
    console.log(`Tag ${tagName} created locally.`);
  } catch (e) {
    console.error(`Failed to create tag locally: ${e.message}`);
    process.exit(1);
  }

  // Push the tag to GitHub
  console.log(`Pushing backup tag ${tagName} to GitHub...`);
  try {
    run(`git push origin ${tagName}`);
    console.log(`Backup tag ${tagName} successfully pushed to GitHub.`);
  } catch (e) {
    console.error(`Warning: Failed to push tag ${tagName} to origin. Make sure remote is configured. Error: ${e.message}`);
    // We continue because local tag is created, but let the user know.
  }

  // 3. Check for local modifications
  const status = run('git status --porcelain');
  if (status) {
    console.log('Detected local changes:');
    console.log(status);
    
    // Get commit message from command line args if any, otherwise default
    const commitMsgArg = process.argv.slice(2).join(' ');
    const commitMsg = commitMsgArg || `Deploy at ${new Date().toLocaleString()}`;
    
    console.log(`Staging changes and committing with message: "${commitMsg}"...`);
    try {
      run('git add .');
      run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
      console.log('Committed local changes.');
    } catch (e) {
      console.error(`Failed to commit changes: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('No local changes to commit.');
  }

  // 4. Push commitment to GitHub to trigger Firebase deploy
  console.log('Pushing latest commits to GitHub (main branch)...');
  try {
    run('git push origin main');
    console.log('Successfully pushed to GitHub!');
    console.log('The GitHub Action will now automatically build and deploy to Firebase Hosting.');
    console.log('You can monitor the progress on GitHub Actions.');
  } catch (e) {
    console.error(`Failed to push to GitHub: ${e.message}`);
    process.exit(1);
  }

  console.log('=== Deployment Script Completed ===');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

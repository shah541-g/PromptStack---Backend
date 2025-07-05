import axios from "axios";
import config from '../config.cjs';
const { API_KEYS } = config;
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';


export async function createGithubRepo(repoName, options = {}, readmeDescription = "") {
  const token = API_KEYS.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not found in config (API_KEYS.GITHUB_TOKEN)');
  }

  const apiUrl = 'https://api.github.com/user/repos';
  const payload = {
    name: repoName,
    ...options,
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const repoData = response.data;

  
    if (readmeDescription) {
      const createReadmeUrl = `https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/contents/README.md`;
      const readmePayload = {
        message: "Add README.md",
        content: Buffer.from(readmeDescription, 'utf-8').toString('base64'),
      };
      await axios.put(createReadmeUrl, readmePayload, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
    }

    return repoData;
  } catch (error) {
    if (error.response) {
      throw new Error(`GitHub API error: ${error.response.status} ${error.response.data.message}`);
    }
    throw error;
  }
}








export async function pushCodeToRepo(projectName, githubRepoUrl, projectType = "nextjs") {
  const token = API_KEYS.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not found in config (API_KEYS.GITHUB_TOKEN)');
  }

  const projectPath = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    try {
      console.log(`[INFO] Removing existing folder: ${projectPath}`);
      fs.rmSync(projectPath, { recursive: true, force: true });
    } catch (err) {
      if (err.code === 'EBUSY') {
        throw new Error(`Cannot delete folder '${projectName}' because it is open or in use. Please close all programs (editors, terminals, File Explorer) using this folder and try again.`);
      } else {
        throw err;
      }
    }
  }

  try {
    console.log(`[INFO] Creating ${projectType} project: ${projectName}`);
    
    switch (projectType.toLowerCase()) {
      case 'nextjs':
      case 'next':
        execSync(`npx create-next-app@latest ${projectName} --use-npm --no-git --yes`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        break;
      case 'react':
        execSync(`npx create-react-app ${projectName} --yes`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        break;
      case 'vue':
        execSync(`npm create vue@latest ${projectName} -- --yes`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        break;
      case 'angular':
        execSync(`npx @angular/cli@latest new ${projectName} --routing --style=css --skip-git --yes`, { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        break;
      case 'node':
      case 'express':
        fs.mkdirSync(projectPath);
        fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
          name: projectName,
          version: '1.0.0',
          description: '',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js'
          },
          dependencies: {
            express: '^4.18.2'
          },
          devDependencies: {
            nodemon: '^3.0.1'
          }
        }, null, 2));
        fs.writeFileSync(path.join(projectPath, 'index.js'), `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});`);
        fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n\nA Node.js/Express application.`);
        break;
      default:
        throw new Error(`Unsupported project type: ${projectType}. Supported types: nextjs, react, vue, angular, node, express`);
    }

    process.chdir(projectPath);
    
    const run = (cmd) => {
      console.log(`[GIT] ${cmd}`);
      try {
        const output = execSync(cmd, { stdio: 'pipe' });
        if (output) console.log(`[GIT OUT] ${output.toString()}`);
      } catch (error) {
        if (error.stdout) console.error(`[GIT STDOUT] ${error.stdout.toString()}`);
        if (error.stderr) console.error(`[GIT STDERR] ${error.stderr.toString()}`);
        throw error;
      }
    };

    run('git init');
    run('git config user.name "PromptStack Bot"');
    run('git config user.email "bot@promptstack.com"');
    run('git add .');
    run('git commit -m "Initial commit"');
    run('git branch -M main');

    
    let remoteUrl = githubRepoUrl;
    if (githubRepoUrl.startsWith('https://github.com/')) {
      remoteUrl = githubRepoUrl.replace(
        'https://github.com/',
        `https://${token}@github.com/`
      );
    }
    
    const maskedRemoteUrl = remoteUrl.replace(token, '***TOKEN***');
    console.log(`[GIT] git remote add origin ${maskedRemoteUrl}`);
    try {
      execSync(`git remote add origin ${remoteUrl}`, { stdio: 'pipe' });
    } catch (error) {
      if (error.stdout) console.error(`[GIT STDOUT] ${error.stdout.toString()}`);
      if (error.stderr) console.error(`[GIT STDERR] ${error.stderr.toString()}`);
      throw error;
    }

    try {
      console.log('[GIT DIAG] git status');
      const status = execSync('git status', { stdio: 'pipe' });
      console.log(status.toString());
      console.log('[GIT DIAG] git remote -v');
      const remoteV = execSync('git remote -v', { stdio: 'pipe' });
      console.log(remoteV.toString());
    } catch (diagErr) {
      console.error('[GIT DIAG ERROR]', diagErr.message);
    }

    try {
      console.log('[GIT] git push -u origin main');
      execSync('git push -u origin main', { stdio: 'pipe' });
    } catch (error) {
      console.error('Error during git push:', error.message);
      if (error.stdout) console.error('[GIT STDOUT]', error.stdout.toString());
      if (error.stderr) console.error('[GIT STDERR]', error.stderr.toString());
      throw new Error('git push failed. See error output above.');
    }
    
    console.log(`Successfully created ${projectType} project and pushed to GitHub!`);
    return githubRepoUrl;
  } catch (error) {
    console.error('Error during project creation or push:', error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
    throw error;
  }
}

export async function pushFolderToRepo(folderName, githubRepoUrl) {
  const token = API_KEYS.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not found in config (API_KEYS.GITHUB_TOKEN)');
  }

  const folderPath = path.resolve(process.cwd(), folderName);

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder '${folderName}' does not exist in the current directory.`);
  }

  try {
    process.chdir(folderPath);
    
    const run = (cmd) => {
      console.log(`[GIT] ${cmd}`);
      try {
        const output = execSync(cmd, { stdio: 'pipe', timeout: 60000 }); // 1 minute timeout per command
        if (output) console.log(`[GIT OUT] ${output.toString()}`);
      } catch (error) {
        if (error.stdout) console.error(`[GIT STDOUT] ${error.stdout.toString()}`);
        if (error.stderr) console.error(`[GIT STDERR] ${error.stderr.toString()}`);
        throw error;
      }
    };

    if (fs.existsSync(path.join(folderPath, '.git'))) {
      console.log('[INFO] Removing existing git repository...');
      fs.rmSync(path.join(folderPath, '.git'), { recursive: true, force: true });
    }

    run('git init');
    run('git config user.name "PromptStack Bot"');
    run('git config user.email "bot@promptstack.com"');

    console.log('[INFO] Adding all files to git...');
    run('git add .');
    run('git commit -m "Initial commit"');
    run('git branch -M main');

    // Prepare remote URL with token
    let remoteUrl = githubRepoUrl;
    if (githubRepoUrl.startsWith('https://github.com/')) {
      remoteUrl = githubRepoUrl.replace(
        'https://github.com/',
        `https://${token}@github.com/`
      );
    }
    
    console.log(`[GIT] git remote add origin ${remoteUrl.replace(token, '***TOKEN***')}`);
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'pipe', timeout: 30000 });

    console.log('[GIT] git push -u origin main');
    try {
      execSync('git push -u origin main', { stdio: 'pipe', timeout: 120000 }); 
    } catch (error) {
      console.error('Error during git push:', error.message);
      if (error.stdout) console.error('[GIT STDOUT]', error.stdout.toString());
      if (error.stderr) console.error('[GIT STDERR]', error.stderr.toString());
      
      if (error.stderr && error.stderr.toString().includes('fetch first')) {
        console.log('[INFO] Remote has commits. Trying force push...');
        try {
          execSync('git push -u origin main --force', { stdio: 'pipe', timeout: 120000 });
          console.log('[INFO] Force push successful!');
        } catch (forceError) {
          console.error('Force push failed:', forceError.message);
          throw new Error('Failed to push to GitHub repository. Repository may have conflicts.');
        }
      } else {
        throw new Error('git push failed. See error output above.');
      }
    }
    
    console.log(`Successfully pushed folder '${folderName}' to GitHub!`);
    return githubRepoUrl;
  } catch (error) {
    console.error('Error during folder push:', error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
    throw error;
  }
}


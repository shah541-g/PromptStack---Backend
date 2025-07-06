import axios from "axios";
import config from '../config.cjs';
const { API_KEYS } = config;
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import projectsModels from '../models/projects.models.js';


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

export async function createFilesFromCodeArray(projectId, codeArray, githubRepoUrl) {
  try {
    const token = API_KEYS.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found in config (API_KEYS.GITHUB_TOKEN)');
    }

    const repoInfo = {
      owner: "usman-temp",
      repo: projectId
    };
    const createdFiles = [];
    const editedFiles = [];
    let updatedFileStructure = null;

    // Fetch current project and structure
    const project = await projectsModels.findById(projectId);
    let currentStructure = project?.stringStucture || '';
    let structureChanged = false;

    for (const codeItem of codeArray) {
      const { tool, path: filePath, code: fileContent, start, end } = codeItem;

      if (tool === 'create') {
        await createFileOnGitHub(repoInfo, filePath, fileContent, token);
        createdFiles.push(filePath);
        // Update file structure
        currentStructure = updateFileStructure(currentStructure, filePath, 'add');
        structureChanged = true;
      } else if (tool === 'edit') {
        await editFileOnGitHub(repoInfo, filePath, fileContent, start, end, token);
        editedFiles.push(filePath);
      } else if (tool === 'delete') {
        await deleteFileOnGitHub(repoInfo, filePath, start, end, token);
        // Update file structure
        currentStructure = updateFileStructure(currentStructure, filePath, 'remove');
        structureChanged = true;
      }
    }

    // Save updated structure if changed
    if (structureChanged) {
      await projectsModels.findByIdAndUpdate(projectId, { stringStucture: currentStructure });
      updatedFileStructure = currentStructure;
    }

    return {
      createdFiles,
      editedFiles,
      updatedFileStructure
    };
  } catch (error) {
    console.error('Error creating files from code array on GitHub:', error);
    throw error;
  }
}



export async function readFileFromGitHub(repoUrl, filePath, token, startLine = null, endLine = null) {
  const repoInfo = extractRepoInfo(repoUrl);
  const fileData = await getFileFromGitHub(repoInfo, filePath, token);
  const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
  let lines = content.split('\n');
  let selectedContent = content;
  if (startLine !== null && endLine !== null) {
    selectedContent = lines.slice(startLine - 1, endLine).join('\n');
  }
  return {
    filePath,
    content: selectedContent,
    startLine,
    endLine,
    totalLines: lines.length
  };
}

export function buildFileReadPrompt({ filePath, content, startLine, endLine, totalLines }) {
  const lines = content.split('\n');
  const numbered = lines.map((line, idx) => {
    const lineNum = idx + 1;
    let prefix = `${lineNum}: `;
    if (
      startLine !== null &&
      endLine !== null &&
      lineNum >= startLine &&
      lineNum <= endLine
    ) {
      prefix = `>>${lineNum}: `;
    }
    return prefix + line;
  });
  let lineInfo = '';
  if (startLine !== null && endLine !== null) {
    lineInfo = ` (requested lines ${startLine}-${endLine} of ${totalLines})`;
  }
  return `Here is the content of file: ${filePath}${lineInfo}\n\n${numbered.join('\n')}`;
}

// Simple in-memory context manager for last 5 prompts
const promptContext = [];
export function addPromptToContext(role, content) {
  promptContext.push({ role, content, timestamp: Date.now() });
  if (promptContext.length > 5) promptContext.shift();
}
export function getPromptContext() {
  return [...promptContext];
}

function extractRepoInfo(githubRepoUrl) {
  const match = githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return {
    owner: match[1],
    repo: match[2].replace('.git', '')
  };
}

async function createFileOnGitHub(repoInfo, filePath, content, token) {
  try {
    const decodedContent = content
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');

    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}`;
    const payload = {
      message: `Create ${filePath}`,
      content: Buffer.from(decodedContent, 'utf-8').toString('base64'),
      branch: 'main'
    };

    const response = await axios.put(apiUrl, payload, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.data;
  } catch (error) {
    if (
      error.response &&
      error.response.status === 422 &&
      error.response.data &&
      typeof error.response.data.message === 'string' &&
      (
        error.response.data.message.includes('already exists') ||
        error.response.data.message.includes('file already exists') ||
        error.response.data.message.includes('"sha" wasn') // ignore missing sha error
      )
    ) {
      return;
    }
    console.error(`Error creating file ${filePath} on GitHub:`, error);
    throw new Error(`Failed to create file ${filePath} on GitHub: ${error.message}`);
  }
}

async function editFileOnGitHub(repoInfo, filePath, newContent, start, end, token) {
  try {
    const decodedContent = newContent
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r');

    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo?.repo}/contents/${filePath}`;
    
    let finalContent = decodedContent;
    let commitMessage = `Update ${filePath}`;

    if (start !== 0 || end !== 0) {
      const currentFile = await getFileFromGitHub(repoInfo, filePath, token);
      const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf-8');
      const lines = currentContent.split('\n');
      
      const beforeLines = lines.slice(0, start - 1);
      const afterLines = lines.slice(end);
      const newLines = decodedContent.split('\n');
      
      finalContent = [...beforeLines, ...newLines, ...afterLines].join('\n');
      commitMessage = `Edit ${filePath} (lines ${start}-${end})`;
    }

    const payload = {
      message: commitMessage,
      content: Buffer.from(finalContent, 'utf-8').toString('base64'),
      sha: await getFileSha(repoInfo, filePath, token),
      branch: 'main'
    };

    const response = await axios.put(apiUrl, payload, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error editing file ${filePath} on GitHub:`, error);
    throw new Error(`Failed to edit file ${filePath} on GitHub: ${error.message}`);
  }
}

async function deleteFileOnGitHub(repoInfo, filePath, start, end, token) {
  try {
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo?.repo}/contents/${filePath}`;
    const payload = {
      message: `Delete ${filePath}`,
      sha: await getFileSha(repoInfo, filePath, token),
      branch: 'main'
    };

    const response = await axios.delete(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error deleting file ${filePath} on GitHub:`, error);
    throw new Error(`Failed to delete file ${filePath} on GitHub: ${error.message}`);
  }
}

async function getFileSha(repoInfo, filePath, token) {
  try {
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo?.repo}/contents/${filePath}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.data.sha;
  } catch (error) {
    console.error(`Error getting SHA for file ${filePath}:`, error);
    throw new Error(`Failed to get SHA for file ${filePath}: ${error.message}`);
  }
}

async function getFileFromGitHub(repoInfo, filePath, token) {
  try {
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`File ${filePath} not found on GitHub`);
  }
}

function updateFileStructure(currentStructure, filePath, action) {
  const lines = currentStructure.split('\n');
  const pathParts = filePath.split('/');
  if (action === 'add') {
    const newLine = '│   '.repeat(pathParts.length - 1) + '├── ' + pathParts[pathParts.length - 1];
    lines.splice(-1, 0, newLine);
  } else if (action === 'remove') {
    const fileName = pathParts[pathParts.length - 1];
    const index = lines.findIndex(line => line.includes(fileName));
    if (index !== -1) {
      lines.splice(index, 1);
    }
  }
  return lines.join('\n');
}
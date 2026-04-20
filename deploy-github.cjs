const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = 'cjdxsw126';
const REPO = 'renyuan';
const BRANCH = 'main';

const filesToUpload = [
  'server/routes/ai.js',
  'server/app.js',
  'server/routes/persons.js',
  'src/App.tsx',
  'src/storageService.ts'
];

async function getLatestCommit() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/commits/${BRANCH}`,
      method: 'GET',
      headers: {
        'User-Agent': 'deploy-script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          resolve(result.sha);
        } else {
          reject(new Error(`Get commit failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function getFileSha(filePath, commitSha) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(filePath);
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/contents/${encodedPath}?ref=${BRANCH}`,
      method: 'GET',
      headers: { 'User-Agent': 'deploy-script' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).sha);
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function uploadFile(filePath, content, sha) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(filePath);
    const contentBase64 = Buffer.from(content).toString('base64');
    
    const body = {
      message: `update: ${filePath} - AI smart search + fixes`,
      content: contentBase64,
      branch: BRANCH
    };
    if (sha) body.sha = sha;

    const postData = JSON.stringify(body);
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/contents/${encodedPath}`,
      method: 'PUT',
      headers: {
        'User-Agent': 'deploy-script',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.status >= 200 && res.status < 300) {
          console.log(`✅ Uploaded: ${filePath}`);
          resolve(true);
        } else {
          console.log(`❌ Failed: ${filePath} - ${res.statusCode}: ${data.substring(0, 100)}`);
          resolve(false);
        }
      });
    });
    req.on('error', (e) => { console.log(`❌ Error ${filePath}:`, e.message); resolve(false); });
    req.setTimeout(30000, () => { req.destroy(); resolve(false); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== GitHub File Uploader ===\n');
  
  try {
    console.log('Getting latest commit SHA...');
    const latestSha = await getLatestCommit();
    console.log(`Latest commit: ${latestSha}\n`);

    for (const file of filesToUpload) {
      const fullPath = path.join(__dirname, file);
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ Skip (not found): ${file}`);
        continue;
      }

      console.log(`Processing: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Try to get existing file SHA
      const sha = await getFileSha(file, latestSha);
      const success = await uploadFile(file, content, sha);
      
      if (!success) {
        console.log(`Retrying without SHA...`);
        await new Promise(r => setTimeout(r, 1000));
        await uploadFile(file, content, null);
      }
      console.log('');
      
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n=== Upload Complete! ===');
    console.log('Please go to Render Dashboard and click "Manual Deploy" to redeploy.');
  } catch (error) {
    console.error('\nError:', error.message);
  }
}

main();
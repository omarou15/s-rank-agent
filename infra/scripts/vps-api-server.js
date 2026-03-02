const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3100;
const API_KEY = process.env.API_KEY || 'changeme';

// MIME types for preview
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain', '.md': 'text/markdown', '.xml': 'text/xml',
};

function getMime(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function runExec(command, timeout = 30000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = exec(command, { timeout, maxBuffer: 10 * 1024 * 1024, shell: '/bin/bash' }, (err, stdout, stderr) => {
      resolve({
        stdout: (stdout || '').slice(0, 50000),
        stderr: (stderr || '').slice(0, 10000),
        exitCode: err ? (err.code || 1) : 0,
        duration: Date.now() - start,
      });
    });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*' });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── PREVIEW ROUTE — serve static files from /home/agent/apps/* or /home/agent/users/*/apps/* ──
  if (pathname.startsWith('/preview/')) {
    const parts = pathname.replace('/preview/', '').split('/');
    
    // Support user-scoped: /preview/user_xxx/appname/file.html
    // Or global: /preview/appname/file.html
    let filePath;
    if (parts[0] && parts[0].startsWith('user_')) {
      const userId = parts[0];
      const appPath = parts.slice(1).join('/') || 'index.html';
      filePath = path.join('/home/agent/users', userId, 'apps', appPath);
    } else {
      const appPath = parts.join('/') || 'index.html';
      filePath = path.join('/home/agent/apps', appPath);
    }
    
    // If path is a directory, serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const mime = getMime(filePath);
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
      return res.end(content);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 — App not found</h1><p>No file at: ' + filePath + '</p>');
    }
  }

  // ── API KEY CHECK for non-preview routes ──
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return json(res, { error: 'Unauthorized' }, 401);

  // ── HEALTH ──
  if (pathname === '/health') {
    const diskRaw = await runExec("df -h / | tail -1 | awk '{print $2, $3, $4, $5}'");
    const memRaw = await runExec("free -m | grep Mem | awk '{print $2, $3}'");
    const disk = diskRaw.stdout.trim().split(' ');
    const mem = memRaw.stdout.trim().split(' ');
    return json(res, {
      status: 'ok',
      disk: { total: disk[0], used: disk[1], available: disk[2], percent: disk[3] },
      memory: { totalMB: mem[0], usedMB: mem[1] },
      uptime: require('os').uptime(),
    });
  }

  // ── EXEC ──
  if (pathname === '/exec' && req.method === 'POST') {
    const body = await parseBody(req);
    const { code, language, timeout } = body;
    if (!code) return json(res, { error: 'Missing code' }, 400);

    let command;
    switch (language || 'bash') {
      case 'python3': case 'python':
        command = `cd /home/agent && python3 -c ${JSON.stringify(code)}`;
        break;
      case 'node': case 'javascript':
        command = `cd /home/agent && node -e ${JSON.stringify(code)}`;
        break;
      default:
        command = `cd /home/agent && ${code}`;
    }
    return json(res, await runExec(command, timeout || 30000));
  }

  // ── FILES LIST ──
  if (pathname === '/files/list' && req.method === 'GET') {
    const dirPath = url.searchParams.get('path') || '/home/agent';
    const result = await runExec(`ls -la --time-style=long-iso ${JSON.stringify(dirPath)} 2>/dev/null`);
    const files = result.stdout.split('\n').slice(1).filter(Boolean).map(line => {
      const parts = line.split(/\s+/);
      if (parts.length < 8) return null;
      const isDir = parts[0].startsWith('d');
      const name = parts.slice(7).join(' ');
      if (name === '.' || name === '..') return null;
      return { name, isDirectory: isDir, size: parseInt(parts[4]) || 0, modified: `${parts[5]} ${parts[6]}`, permissions: parts[0] };
    }).filter(Boolean);
    return json(res, { path: dirPath, files });
  }

  // ── FILES READ ──
  if (pathname === '/files/read' && req.method === 'GET') {
    const filePath = url.searchParams.get('path') || '';
    const result = await runExec(`cat ${JSON.stringify(filePath)} 2>/dev/null`);
    return json(res, { path: filePath, content: result.stdout, error: result.exitCode !== 0 ? result.stderr : undefined });
  }

  // ── FILES WRITE ──
  if (pathname === '/files/write' && req.method === 'POST') {
    const body = await parseBody(req);
    const { path: filePath, content, encoding } = body;
    if (!filePath) return json(res, { error: 'Missing path' }, 400);
    
    // Ensure parent dir exists
    await runExec(`mkdir -p ${JSON.stringify(path.dirname(filePath))}`);
    
    if (encoding === 'base64') {
      fs.writeFileSync(filePath, Buffer.from(content, 'base64'));
    } else {
      fs.writeFileSync(filePath, content || '', 'utf8');
    }
    return json(res, { success: true, path: filePath });
  }

  // ── FILES MKDIR ──
  if (pathname === '/files/mkdir' && req.method === 'POST') {
    const body = await parseBody(req);
    await runExec(`mkdir -p ${JSON.stringify(body.path)}`);
    return json(res, { success: true });
  }

  // ── FILES DELETE ──
  if (pathname === '/files/delete' && req.method === 'POST') {
    const body = await parseBody(req);
    await runExec(`rm -rf ${JSON.stringify(body.path)}`);
    return json(res, { success: true });
  }

  // ── FILES RENAME ──
  if (pathname === '/files/rename' && req.method === 'POST') {
    const body = await parseBody(req);
    await runExec(`mv ${JSON.stringify(body.oldPath)} ${JSON.stringify(body.newPath)}`);
    return json(res, { success: true });
  }

  // ── FILES DOWNLOAD (base64 for binary) ──
  if (pathname === '/files/download' && req.method === 'GET') {
    const filePath = url.searchParams.get('path') || '';
    try {
      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const textExts = ['.txt','.md','.json','.csv','.py','.js','.ts','.html','.css','.sh','.yaml','.yml','.xml','.toml','.sql','.log','.env'];
      
      if (textExts.includes(ext)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return json(res, { content, size: stat.size });
      } else {
        const content = fs.readFileSync(filePath);
        const base64 = content.toString('base64');
        return json(res, { base64, mime: getMime(filePath), size: stat.size });
      }
    } catch (e) {
      return json(res, { error: 'File not found' }, 404);
    }
  }

  // ── CRONS ──
  if (pathname === '/crons') {
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync('/opt/srank-api/crons.json', 'utf8');
        return json(res, JSON.parse(data));
      } catch { return json(res, []); }
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      let crons = [];
      try { crons = JSON.parse(fs.readFileSync('/opt/srank-api/crons.json', 'utf8')); } catch {}
      crons.push(body);
      fs.writeFileSync('/opt/srank-api/crons.json', JSON.stringify(crons, null, 2));
      return json(res, { success: true });
    }
  }

  // ── EMAIL SEND ──
  if (pathname === '/email/send' && req.method === 'POST') {
    const body = await parseBody(req);
    // Simple email via msmtp or external service
    const { to, subject, body: emailBody } = body;
    const cmd = `echo ${JSON.stringify(emailBody)} | mail -s ${JSON.stringify(subject)} ${JSON.stringify(to)} 2>&1 || echo "Email requires mail setup"`;
    const result = await runExec(cmd);
    return json(res, { success: true, output: result.stdout });
  }

  // ── 404 ──
  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`S-Rank API running on port ${PORT}`);
  // Ensure directories exist
  exec('mkdir -p /home/agent/apps /home/agent/uploads /home/agent/users');
});

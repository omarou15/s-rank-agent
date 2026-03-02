#!/bin/bash
# Deploy preview route + Office libs to VPS
VPS="http://46.225.103.230:3100"
KEY="changeme"

cat > /tmp/setup_preview.py << 'PYEOF'
import os

# 1. Install Python office libs
os.system("pip3 install python-docx openpyxl python-pptx --break-system-packages 2>/dev/null || pip3 install python-docx openpyxl python-pptx")

# 2. Create apps directory
os.makedirs("/home/agent/apps", exist_ok=True)

# 3. Add preview route to VPS API
with open("/opt/srank-api/server.js", "r") as f:
    content = f.read()

if "/preview/" in content:
    print("Preview route exists")
else:
    route = '''
// Preview - serve static files from user apps
const path = require("path");
const mime = require("mime-types") || {};
const MIME_MAP = {
  html: "text/html", htm: "text/html", css: "text/css", js: "application/javascript",
  json: "application/json", svg: "image/svg+xml", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", txt: "text/plain",
  xml: "application/xml", pdf: "application/pdf",
};

app.get("/preview/:appName", (req, res) => res.redirect(`/preview/${req.params.appName}/`));
app.get("/preview/:appName/*", (req, res) => {
  const appName = req.params.appName;
  const filePath = req.path.replace(`/preview/${appName}/`, "") || "index.html";
  const fullPath = path.join("/home/agent/apps", appName, filePath);
  
  // Security: prevent directory traversal
  if (fullPath.includes("..")) return res.status(403).send("Forbidden");
  
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    const ext = fullPath.split(".").pop().toLowerCase();
    const ct = MIME_MAP[ext] || "text/plain";
    res.setHeader("Content-Type", ct + "; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch (e) {
    // Try index.html for SPA
    try {
      const idx = path.join("/home/agent/apps", appName, "index.html");
      const content = fs.readFileSync(idx, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(content);
    } catch {
      res.status(404).send("File not found: " + filePath);
    }
  }
});

'''
    # Insert before the listen/port line
    content = content.replace('\napp.listen', route + '\napp.listen')
    with open("/opt/srank-api/server.js", "w") as f:
        f.write(content)
    print("Preview route added")

os.system("systemctl restart srank-api")
print("Done - Preview route + Office libs installed")
PYEOF

B64=$(base64 -w0 /tmp/setup_preview.py)
curl -s -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  "$VPS/exec" -d "{\"code\": \"import base64\nexec(base64.b64decode('$B64').decode())\", \"language\": \"python3\"}" 2>&1

sleep 3

# Test preview route
curl -s -o /dev/null -w "%{http_code}" "$VPS/preview/test/" 2>&1
echo ""

# Test python libs
curl -s -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  "$VPS/exec" -d '{"code": "from docx import Document; from openpyxl import Workbook; from pptx import Presentation; print(\"Office libs OK\")", "language": "python3"}' 2>&1

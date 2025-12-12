#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");

const REPO_URL = "https://raw.githubusercontent.com/nicobailon/pi-rewind-hook/main";
const HOOK_DIR = path.join(os.homedir(), ".pi", "agent", "hooks", "rewind");
const SETTINGS_FILE = path.join(os.homedir(), ".pi", "agent", "settings.json");
const HOOK_PATH = "~/.pi/agent/hooks/rewind/index.ts";

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  console.log("Installing pi-rewind-hook...\n");

  // Create hook directory
  console.log(`Creating directory: ${HOOK_DIR}`);
  fs.mkdirSync(HOOK_DIR, { recursive: true });

  // Download hook files
  console.log("Downloading index.ts...");
  const hookContent = await download(`${REPO_URL}/index.ts`);
  fs.writeFileSync(path.join(HOOK_DIR, "index.ts"), hookContent);

  console.log("Downloading README.md...");
  const readmeContent = await download(`${REPO_URL}/README.md`);
  fs.writeFileSync(path.join(HOOK_DIR, "README.md"), readmeContent);

  // Update settings.json
  console.log(`\nUpdating settings: ${SETTINGS_FILE}`);
  
  let settings = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    } catch (err) {
      console.error(`Warning: Could not parse existing settings.json: ${err.message}`);
      console.error("Creating new settings file...");
    }
  }

  // Ensure hooks array exists
  if (!Array.isArray(settings.hooks)) {
    settings.hooks = [];
  }

  // Add hook if not already present
  if (!settings.hooks.includes(HOOK_PATH)) {
    settings.hooks.push(HOOK_PATH);
    
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + "\n");
    console.log(`Added "${HOOK_PATH}" to hooks array`);
  } else {
    console.log("Hook already configured in settings.json");
  }

  console.log("\nInstallation complete!");
  console.log("\nThe rewind hook will load automatically when you start pi.");
  console.log("Use /branch to rewind to a previous checkpoint.");
}

main().catch((err) => {
  console.error(`\nInstallation failed: ${err.message}`);
  process.exit(1);
});

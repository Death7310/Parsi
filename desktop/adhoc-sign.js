// macOS refuses to run unsigned Apple Silicon code, and this app isn't signed with a paid Apple Developer ID.
// An ad-hoc signature (no identity) is enough for macOS to run it once the user allows it in Privacy & Security.
// The bundled whisper-cli is signed first, because codesign --deep doesn't reach files in Contents/Resources.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const bin = path.join(app, "Contents", "Resources", "bin");
  for (const f of fs.existsSync(bin) ? fs.readdirSync(bin) : []) {
    execFileSync("codesign", ["--force", "--sign", "-", path.join(bin, f)], { stdio: "inherit" });
  }
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
};

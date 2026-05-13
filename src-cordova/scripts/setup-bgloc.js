#!/usr/bin/env node
/*
 * cordova-fetch resolves the `file:local-plugins/...` reference in package.json
 * `cordova.plugins` from the wrong working directory (one level above src-cordova),
 * so `cordova prepare` fails with "Cannot find module" the first time it tries to
 * restore the bgloc plugin. We sidestep that by pre-installing bgloc with an
 * absolute path during npm postinstall; once it's in src-cordova/plugins/, cordova
 * never tries to re-fetch it.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const bglocSrc = path.join(projectRoot, 'local-plugins', 'cordova-background-geolocation-katasterjam')
const bglocInstalled = path.join(projectRoot, 'plugins', 'cordova-background-geolocation-katasterjam')

if (fs.existsSync(bglocInstalled)) {
  console.log('[setup-bgloc] already installed in plugins/, skipping')
  process.exit(0)
}

if (!fs.existsSync(path.join(bglocSrc, 'package.json'))) {
  console.warn(`[setup-bgloc] ${bglocSrc} is empty — run 'git submodule update --init --recursive' first`)
  process.exit(0)
}

console.log(`[setup-bgloc] pre-installing bgloc plugin with absolute path...`)
const result = spawnSync('npx', ['cordova', 'plugin', 'add', bglocSrc, '--nosave'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

if (result.status !== 0) {
  console.warn('[setup-bgloc] cordova plugin add failed — you may need to run it manually')
  console.warn(`  cd src-cordova && npx cordova plugin add "${bglocSrc}"`)
}

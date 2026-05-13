#!/usr/bin/env node
/*
 * cordova-plugin-file 7.0.0 and cordova-plugin-saf-mediastore 1.0.10 both
 * declare WRITE_EXTERNAL_STORAGE without android:maxSdkVersion. Combined with
 * cordova-plugin-camera 7.0.0 (which DOES cap at maxSdkVersion=32), AGP 8's
 * manifest merger fails with "duplicated uses-permission". This hook patches
 * those two plugin.xmls, the munge cache, and the generated AndroidManifest.xml
 * after every plugin install so the build succeeds on a fresh clone.
 */
const fs = require('fs')
const path = require('path')

const BARE_RX = /<uses-permission\s+android:name="android\.permission\.WRITE_EXTERNAL_STORAGE"\s*\/>/g
const FIXED_TAG_INDENT4 = '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot
  const pluginsDir = path.join(projectRoot, 'plugins')

  patchPluginXml(path.join(pluginsDir, 'cordova-plugin-file', 'plugin.xml'))
  patchPluginXml(path.join(pluginsDir, 'cordova-plugin-saf-mediastore', 'plugin.xml'))

  cleanMungeCache(path.join(projectRoot, 'platforms', 'android', 'android.json'))
  fixManifest(path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'))
}

function patchPluginXml (file) {
  if (!fs.existsSync(file)) return
  const orig = fs.readFileSync(file, 'utf8')
  if (!BARE_RX.test(orig)) return
  BARE_RX.lastIndex = 0
  fs.writeFileSync(file, orig.replace(BARE_RX, FIXED_TAG_INDENT4))
  console.log(`[hook fix-write-external-storage] patched ${path.relative(process.cwd(), file)}`)
}

function cleanMungeCache (jsonPath) {
  if (!fs.existsSync(jsonPath)) return
  const aj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const files = (aj.config_munge && aj.config_munge.files) || {}
  let changed = false

  if ('undefined' in files) {
    delete files['undefined']
    changed = true
  }

  const manifestParents = (files['AndroidManifest.xml'] && files['AndroidManifest.xml'].parents) || {}
  for (const parent of Object.keys(manifestParents)) {
    let mutated = false
    manifestParents[parent] = manifestParents[parent].map(it => {
      const x = it.xml || ''
      if (x.includes('WRITE_EXTERNAL_STORAGE') && !x.includes('maxSdkVersion')) {
        mutated = true
        return Object.assign({}, it, { xml: FIXED_TAG_INDENT4 })
      }
      return it
    })
    if (mutated) changed = true
  }

  if (changed) {
    fs.writeFileSync(jsonPath, JSON.stringify(aj, null, 2))
    console.log(`[hook fix-write-external-storage] cleaned munge cache`)
  }
}

function fixManifest (manifestPath) {
  if (!fs.existsSync(manifestPath)) return
  const orig = fs.readFileSync(manifestPath, 'utf8')
  let updated = orig.replace(BARE_RX, FIXED_TAG_INDENT4)

  const lines = updated.split('\n')
  let seenFixed = false
  const result = []
  for (const line of lines) {
    const isFixedWrite = line.includes('WRITE_EXTERNAL_STORAGE') && line.includes('maxSdkVersion="32"')
    if (isFixedWrite) {
      if (seenFixed) continue
      seenFixed = true
    }
    result.push(line)
  }
  updated = result.join('\n')

  if (updated !== orig) {
    fs.writeFileSync(manifestPath, updated)
    console.log(`[hook fix-write-external-storage] cleaned AndroidManifest.xml`)
  }
}

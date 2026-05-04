# Kataster jam

Aplikacija za terensko delo popisa jam

## Cloning

This repo includes [cordova-background-geolocation-katasterjam](https://github.com/DZRJL/cordova-background-geolocation-katasterjam) as a git submodule at `src-cordova/local-plugins/cordova-background-geolocation-katasterjam`. Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/DZRJL/katasterjam-mobile.git
```

For an existing clone after pulling a change that updates the submodule:

```bash
git submodule update --init --recursive
```

**Windows: enable long paths first.** The submodule contains source paths over 260 characters; without long-path support `git submodule add`/`update` fails with `Filename too long`. Run once per machine:

```bash
git config --global core.longpaths true
```

## Install Cordova
Follow instructions here (chapter #1): https://quasar.dev/quasar-cli-vite/developing-cordova-apps/preparation

(install Android Studio, set up PATH, etc... you can skip chapters #2, #3 and #4 - they are already done)
```bash
npm install -g cordova
```

## Install the dependencies
```bash
npm install
# install cordova dependencies
cd src-cordova
cordova platform add android@11
npm install
# check if everything is set up correctly
cordova requirements
```

### Start the app in development mode
```bash
npm run dev
# or run cordova in dev mode
npm run mobile
```

### Build the app for production
```bash
# build full android package
npm run build-mobile
# only update www files (faster)
npm run mobile-update
```

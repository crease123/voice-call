/** Build each plugin with local tools and the committed Typert artifacts. */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
function run(file, args = [], cwd = root) {
  const result = spawnSync(process.execPath, [resolve(root, file), ...args], { cwd, stdio: 'inherit', env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
function build(name) {
  const path = `packages/experimental/${name}`
  run('node_modules/typescript/bin/tsc', ['--noEmit', 'false', '--rewriteRelativeImportExtensions', '-p', `${path}/tsconfig.json`])
  run('node_modules/tsdown/dist/run.mjs', [], resolve(root, path))
}
run('scripts/stage-typert.mjs')
build('voice-speech-doubao')
build('personal-agent')
build('client-ui-voice-conversation')
run('node_modules/tsdown/dist/run.mjs', ['--config', 'tsdown.client.config.ts'], resolve(root, 'packages/experimental/client-ui-voice-conversation'))
build('voice-conversation-bundle')

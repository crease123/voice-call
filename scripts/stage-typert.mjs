/**
 * Stage the committed Typert artifacts into each package's `lib/` before the
 * TypeScript build starts.
 *
 * The files are generated in a DeepSeek Harness checkout (see
 * `scripts/generate-remote.mjs`) and committed under `generated/`, so a clean
 * runner can build this repository without a Harness checkout.
 *
 * To refresh them after changing `@Remote` methods or the protocol line:
 *
 *   DSH_HARNESS_ROOT=<harness checkout> pnpm run regen:typert
 */
import { cp, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packages = ['voice-speech-doubao', 'personal-agent']
const files = ['typert.host.js', 'typert.host.d.ts', 'typert.remote-client.js', 'typert.remote-client.d.ts']

for (const name of packages) {
  const source = join(root, 'generated', name)
  const target = join(root, 'packages/experimental', name, 'lib')
  await mkdir(target, { recursive: true })
  for (const file of files) await cp(join(source, file), join(target, file))
  console.log(`Staged Typert artifacts for ${name}.`)
}
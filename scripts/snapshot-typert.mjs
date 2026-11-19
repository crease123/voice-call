/**
 * Copy freshly generated Typert artifacts out of each package's `lib/` and into
 * `generated/`, which is committed.
 *
 * `pnpm run regen:typert` runs this after `scripts/generate-remote.mjs`, which
 * needs `DSH_HARNESS_ROOT` pointing at a matching Harness checkout.
 */
import { cp, mkdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packages = ['voice-speech-doubao', 'personal-agent']
const files = ['typert.host.js', 'typert.host.d.ts', 'typert.remote-client.js', 'typert.remote-client.d.ts']

for (const name of packages) {
  const source = join(root, 'packages/experimental', name, 'lib')
  const target = join(root, 'generated', name)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  for (const file of files) await cp(join(source, file), join(target, file))
  console.log(`Snapshotted Typert artifacts for ${name}.`)
}
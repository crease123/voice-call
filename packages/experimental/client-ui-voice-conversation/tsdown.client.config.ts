/**
 * Client-face build: one CommonJS closure-factory bundle that the browser
 * module table loads through `window.__ModuleLoader__.load({ id, factory })`.
 *
 * This used to import the Harness preset (`packages/client/tsdown.client.ts`)
 * from a checkout, which made `pnpm run build` impossible on a clean runner.
 * The contract it implements is small and stable: externalize exactly the
 * shell-seeded module table, inline everything else, and emit the loader
 * handoff. The module list below is pinned to DeepSeek Harness 0.2.2-rc.1
 * (`packages/client/web/src/platform.ts`); revisit it when `engines.dsh` moves.
 *
 * Run after the Host build: this face consumes the sibling packages'
 * `lib/typert.remote-client.js` through their `./remote` exports.
 *
 * @module @deepseek-ai/dsh-client-ui-voice-conversation/client
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, relative, resolve as resolvePath, sep } from 'node:path'
import { defineConfig, type TsdownPlugin, type UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

/** Package name this bundle registers under; also the Loader row's specifier. */
const ID = '@deepseek-ai/dsh-client-ui-voice-conversation'

/** This package's root: virtual CSS ids are keyed relative to it, never by a machine path. */
const PACKAGE_ROOT = import.meta.dirname

/**
 * The module table the shell seeds before any plugin runs. Each specifier stays
 * a `require()`; anything else must be bundled.
 */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  'zod', '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

/** Path segment separating a package's tsc output from the sources it was emitted from. */
const TYPES_MARKER = `${sep}lib${sep}types${sep}`

/** Virtual-id wrapper keeping module CSS away from tsdown's own CSS pipeline. */
const CSS_PREFIX = '\0dsh-voice-css:'
const CSS_SUFFIX = '.mjs'

/**
 * Resolve an import written against a `lib/types/` module onto the file that
 * actually exists. tsc rewrites `.ts` specifiers but copies no stylesheet, so
 * an emitted `./VoiceSettings.module.css` still lives under `src/`.
 * @param source - relative or bare import specifier as written in the source.
 * @param importer - absolute path of the importing module.
 * @returns the file on disk.
 */
function sourceAssetPath(source: string, importer: string): string {
  if (!source.startsWith('.') && !isAbsolute(source)) return createRequire(importer).resolve(source)
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  const boundary = emitted.indexOf(TYPES_MARKER)
  if (boundary < 0) return emitted
  return resolvePath(emitted.slice(0, boundary), 'src', emitted.slice(boundary + TYPES_MARKER.length))
}

/**
 * Compile a CSS Module inside the bundle: emit its hashed class map and inject
 * the tagged stylesheet once at factory execution.
 * @param pluginId - package name stamped onto the injected style tag.
 * @returns the rolldown plugin.
 */
function cssModulesInline(pluginId: string): TsdownPlugin {
  return {
    name: 'dsh-voice-css-modules-inline',
    resolveId: {
      order: 'pre' as const,
      handler(source: string, importer: string | undefined) {
        if (!source.endsWith('.module.css')) return null
        const file = importer === undefined ? source : sourceAssetPath(source, importer)
        // The virtual id is what rolldown prints verbatim in its `//#region`
        // comments, so it must not carry a machine path. Key it by the
        // package-relative name and resolve that at load time.
        return CSS_PREFIX + relative(PACKAGE_ROOT, file) + CSS_SUFFIX
      },
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_PREFIX)) return null
      const source = virtualId.slice(CSS_PREFIX.length, -CSS_SUFFIX.length)
      const fileId = resolvePath(PACKAGE_ROOT, source)
      this.addWatchFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: await readFile(fileId),
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      const entries = Object.entries(cssExports ?? {})
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      for (const [local, exported] of entries) classMap[local] = exported.name
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(`${pluginId}/${source}`)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(pluginId)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }
}

const config: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  // The bundle's own request list decides externalization, exactly as the
  // Harness client build states it: a requested specifier stays a `require()`
  // the module table answers, and everything else — zod, the generated Remote
  // contributions, the stylesheets — inlines.
  deps: {
    neverBundle: (specifier: string) => PLATFORM_MODULES.includes(specifier),
    alwaysBundle: (specifier: string) => !PLATFORM_MODULES.includes(specifier),
  },
  inputOptions: {
    resolve: { conditionNames: ['browser', 'import', 'module', 'default'] },
  },
  plugins: [cssModulesInline(ID)],
  outputOptions: {
    entryFileNames: 'client.js',
    // The closure-factory handoff the module table answers. `intro` gives the
    // factory body a CommonJS-module identity; `footer` returns it.
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig(config)
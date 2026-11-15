/** Compact call activity within the existing composer toolbar. */
import { useEffect, useRef } from 'react'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { CallState } from './call.ts'
import { NS } from './locales.ts'
import { subscribeVoiceLevel } from './levels.ts'
import css from './VoiceConversation.module.css'

/** Phone handset for starting and ending a voice call. */
function PhoneIcon({ hangup = false }: { hangup?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    style={hangup ? { transform: 'rotate(135deg)' } : undefined}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
  </svg>
}

/** Plain call commands and the renderer-bound state source. */
export interface VoiceConversationInjected {
  /** Begin a call or replace one that ended with an error. */
  start: (sessionId: SessionId) => void
  /** Close the Session's call and release its own audio resources. */
  hangup: (sessionId: SessionId) => void
  hooks: { voiceCalls: HostObservable<ReadonlyMap<SessionId, CallState>> }
}

/** Composer activity props derived from its declared slot and injected contribution. */
export type VoiceConversationProps = Pick<PropsRuntime<'conversation.input.activity'>, 'sessionId' | 'locked' | 'onActiveChange'>
  & PropsLocale<typeof NS> & InjectFace<VoiceConversationInjected>

/** Render a call action, its in-place state, and recoverable failures. */
export function VoiceConversation({ sessionId, locked, onActiveChange, start, hangup, useVoiceCalls, t }: VoiceConversationProps) {
  const panel = useRef<HTMLDivElement>(null)
  const state = useVoiceCalls(calls => calls.get(sessionId))
  const active = state !== undefined && state.phase !== 'idle' && state.phase !== 'error'
  useEffect(() => {
    if (!active) return
    return subscribeVoiceLevel(sessionId, level => { panel.current?.style.setProperty('--voice-level', String(level)) })
  }, [active, sessionId])
  useEffect(() => { onActiveChange(active); return () => { onActiveChange(false) } }, [active, onActiveChange])
  useEffect(() => () => { hangup(sessionId) }, [sessionId, hangup])
  if (state === undefined || state.phase === 'idle' || state.phase === 'error') return <div className={css.row} data-voice-conversation={state?.phase ?? 'idle'}>
    <Tooltip label={t(state?.phase === 'error' ? 'retry' : 'start')} portal side="top">
      <Button type="button" size="sm" disabled={locked} aria-label={t(state?.phase === 'error' ? 'retry' : 'start')}
        onClick={() => { start(sessionId) }}><PhoneIcon /></Button>
    </Tooltip>
    {state?.phase === 'error' && <span className={css.error} role="alert">{t(state.failure)}</span>}
  </div>
  return <div ref={panel} className={css.call} data-voice-active data-voice-conversation={state.phase}>
    <div className={css.bars} aria-hidden="true" data-voice-bars>
      <span /><span /><span /><span /><span />
    </div>
    <span className={css.status} role="status">{t(state.phase)}</span>
    {state.warning && <span className={css.error} role="alert">{t(state.warning)}</span>}
    <Tooltip label={t('hangup')} portal side="top">
      <Button type="button" size="sm" disabled={state.phase === 'stopping'} aria-label={t('hangup')}
        onClick={() => { hangup(sessionId) }}><PhoneIcon hangup /><span>{t('hangup')}</span></Button>
    </Tooltip>
  </div>
}

import { useState } from 'react'
import { hasSavedPasskey, registerPasskey, loadSavedWebAuthnKey, clearSavedPasskey } from '../lib/passkey'
import { createSmartWalletClient, linkToPasskeyRegistry, getAccountAddress, type SmartWalletClient } from '../lib/wallet'
import { getConfig } from '../config'

type Props = {
  onLogin: (client: SmartWalletClient) => void
}

export default function Login({ onLogin }: Props) {
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const hasKey = hasSavedPasskey()
  const hasRegistry = !!getConfig().passkeyRegistryAddress

  async function handleRegister() {
    setError('')
    setLoading(true)
    try {
      setStatus('Passkey를 생성하는 중...')
      const webAuthnKey = await registerPasskey()

      setStatus('AA 지갑을 초기화하는 중...')
      const client = await createSmartWalletClient(webAuthnKey)
      const address = getAccountAddress(client)

      if (hasRegistry) {
        setStatus('PasskeyRegistry에 등록하는 중...')
        const result = await linkToPasskeyRegistry(client, webAuthnKey.authenticatorIdHash)
        if (result === 'linked') {
          setStatus(`등록 완료 — AA: ${address}`)
        } else {
          setStatus(`지갑 준비 완료 — AA: ${address}`)
        }
      } else {
        setStatus(`지갑 준비 완료 — AA: ${address}`)
      }

      onLogin(client)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      setStatus('저장된 Passkey를 불러오는 중...')
      const webAuthnKey = loadSavedWebAuthnKey()
      if (!webAuthnKey) throw new Error('저장된 Passkey가 없습니다. 먼저 등록해 주세요.')

      setStatus('AA 지갑을 복원하는 중...')
      const client = await createSmartWalletClient(webAuthnKey)
      const address = getAccountAddress(client)
      setStatus(`지갑 복원 완료 — AA: ${address}`)
      onLogin(client)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    clearSavedPasskey()
    window.location.reload()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '480px', fontFamily: 'monospace' }}>
      <h2>Passkey 로그인</h2>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>
        개인키를 저장하지 않습니다. 모든 서명은 Passkey(WebAuthn)로만 이루어집니다.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        {!hasKey && (
          <button onClick={handleRegister} disabled={loading}>
            새 Passkey 등록
          </button>
        )}
        {hasKey && (
          <button onClick={handleLogin} disabled={loading}>
            저장된 Passkey로 로그인
          </button>
        )}
        {hasKey && (
          <button onClick={handleClear} disabled={loading} style={{ background: '#eee', color: '#333' }}>
            Passkey 초기화
          </button>
        )}
      </div>

      {status && <p style={{ marginTop: '1rem', color: '#2a6' }}>{status}</p>}
      {error && <p style={{ marginTop: '1rem', color: '#c33' }}>오류: {error}</p>}
    </div>
  )
}

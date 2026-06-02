import { useState } from 'react'
import { getMissingEnvKeys } from './config'
import Login from './components/Login'
import DataEditor from './components/DataEditor'
import DataViewer from './components/DataViewer'
import type { SmartWalletClient } from './lib/wallet'

export default function App() {
  const missing = getMissingEnvKeys()
  const [client, setClient] = useState<SmartWalletClient | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  if (missing.length > 0) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>Trustless dApp PoC</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #856404', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
          <strong>미설정 환경변수 ({missing.length}개)</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.5rem' }}>
            {missing.map((k) => (
              <li key={k} style={{ color: '#856404' }}>{k}</li>
            ))}
          </ul>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            .env.example을 참고해 .env 파일에 값을 채워주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', fontFamily: 'monospace' }}>
      <h1>Trustless dApp PoC</h1>

      {!client ? (
        <Login onLogin={setClient} />
      ) : (
        <>
          <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>
            AA 주소: <code style={{ wordBreak: 'break-all' }}>{client.account.address}</code>
          </div>
          <button
            onClick={() => setClient(null)}
            style={{ fontSize: '0.8rem', background: '#eee', color: '#333', padding: '0.2rem 0.6rem' }}
          >
            로그아웃
          </button>

          <DataEditor
            client={client}
            onSuccess={() => setRefreshTrigger((n) => n + 1)}
          />

          <hr style={{ margin: '1.5rem 0', borderColor: '#eee' }} />

          <DataViewer
            client={client}
            refreshTrigger={refreshTrigger}
          />
        </>
      )}
    </div>
  )
}

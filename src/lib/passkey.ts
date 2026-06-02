import { keccak256 } from 'viem'
import type { WebAuthnKey } from '@zerodev/webauthn-key'

const RP_NAME = 'Trustless dApp PoC'
const STORAGE_KEY = 'dapp_webauthn_key'

type StoredKey = {
  pubX: string
  pubY: string
  authenticatorId: string
  authenticatorIdHash: `0x${string}`
}

function b64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
  const binary = atob(padded)
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)))
}

function uint8ArrayToHex(arr: Uint8Array): `0x${string}` {
  return `0x${[...arr].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

async function extractP256Coords(spkiDer: ArrayBuffer): Promise<{ pubX: bigint; pubY: bigint }> {
  const key = await crypto.subtle.importKey(
    'spki',
    spkiDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  )
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  // raw format: 0x04 | x (32 bytes) | y (32 bytes)
  const pubX = BigInt(uint8ArrayToHex(raw.subarray(1, 33)))
  const pubY = BigInt(uint8ArrayToHex(raw.subarray(33, 65)))
  return { pubX, pubY }
}

export function hasSavedPasskey(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function loadSavedWebAuthnKey(): WebAuthnKey | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const stored: StoredKey = JSON.parse(raw)
    return {
      pubX: BigInt(stored.pubX),
      pubY: BigInt(stored.pubY),
      authenticatorId: stored.authenticatorId,
      authenticatorIdHash: stored.authenticatorIdHash,
      rpID: window.location.hostname,
    }
  } catch {
    return null
  }
}

export function clearSavedPasskey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function registerPasskey(): Promise<WebAuthnKey> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(16))

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: { id: userId, name: RP_NAME, displayName: RP_NAME },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256 / P-256
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'required',
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Passkey 생성이 취소되었습니다')

  const response = credential.response as AuthenticatorAttestationResponse
  const spkiDer = response.getPublicKey()
  if (!spkiDer) throw new Error('공개키를 추출할 수 없습니다')

  const { pubX, pubY } = await extractP256Coords(spkiDer)
  const authenticatorId = credential.id
  const authenticatorIdHash = keccak256(uint8ArrayToHex(b64urlToUint8Array(authenticatorId)))

  const webAuthnKey: WebAuthnKey = {
    pubX,
    pubY,
    authenticatorId,
    authenticatorIdHash,
    rpID: window.location.hostname,
  }

  const stored: StoredKey = {
    pubX: pubX.toString(),
    pubY: pubY.toString(),
    authenticatorId,
    authenticatorIdHash,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

  return webAuthnKey
}

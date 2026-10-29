/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_ALLOW_GUEST?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AI_PROVIDER?: string
  readonly VITE_AI_API_KEY?: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_AI_BASE_URL?: string
  readonly VITE_MAX_UPLOAD_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

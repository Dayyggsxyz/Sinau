const env = import.meta.env

export const config = {
  googleClientId: (env.VITE_GOOGLE_CLIENT_ID ?? '').trim(),
  allowGuest: (env.VITE_ALLOW_GUEST ?? 'true') !== 'false',
  apiBaseUrl: (env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, ''),
  aiProvider: (env.VITE_AI_PROVIDER ?? 'mock').trim().toLowerCase(),
  aiApiKey: (env.VITE_AI_API_KEY ?? '').trim(),
  aiModel: (env.VITE_AI_MODEL ?? '').trim(),
  aiBaseUrl: (env.VITE_AI_BASE_URL ?? '').trim().replace(/\/$/, ''),
  maxUploadMb: Number(env.VITE_MAX_UPLOAD_MB ?? 20),
}

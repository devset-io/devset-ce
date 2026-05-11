/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UI_VERSION?: string
  readonly VITE_API_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

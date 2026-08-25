/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCAN_API_URL?: string;
  readonly VITE_SCAN_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // web 밖의 core/, shared/를 import해요
  server: { fs: { allow: ['..'] } },
  // MediaPipe wasm(약 11MB)이 커서 경고 기준을 올려요
  build: { chunkSizeWarningLimit: 1500 },
});

import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{output:{onlyExplicitManualChunks:true,manualChunks(id){if(id.includes('three/examples/'))return 'three-addons';if(id.includes('three/'))return 'three';}}}},server:{strictPort:true}});

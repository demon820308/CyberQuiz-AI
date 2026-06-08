import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Vite plugin to sync E:\yuwen folder to src/lib/data/yuwen in local development
function syncYuwenPlugin() {
	const sourceDir = 'E:\\yuwen';
	const destDir = path.join(process.cwd(), 'src', 'lib', 'data', 'yuwen');

	const syncFiles = () => {
		if (fs.existsSync(sourceDir)) {
			console.log(`[Sync Yuwen] Syncing files from "${sourceDir}" to "${destDir}"...`);
			try {
				if (!fs.existsSync(destDir)) {
					fs.mkdirSync(destDir, { recursive: true });
				}
				const files = fs.readdirSync(sourceDir);
				let count = 0;
				for (const file of files) {
					if (file.endsWith('.md')) {
						const srcFile = path.join(sourceDir, file);
						const destFile = path.join(destDir, file);
						const content = fs.readFileSync(srcFile, 'utf-8');
						fs.writeFileSync(destFile, content, 'utf-8');
						count++;
					}
				}
				console.log(`[Sync Yuwen] Success: Synced ${count} files.`);
			} catch (err) {
				console.error('[Sync Yuwen Error] Failed to sync files:', err);
			}
		} else {
			console.log('[Sync Yuwen] E:\\yuwen folder not found on this machine. Sync skipped.');
		}
	};

	return {
		name: 'sync-yuwen-plugin',
		// Run sync once at the start of build or dev server
		buildStart() {
			syncFiles();
		},
		// Watch E:\yuwen for changes in dev mode
		configureServer(server) {
			if (fs.existsSync(sourceDir)) {
				fs.watch(sourceDir, (eventType, filename) => {
					if (filename && filename.endsWith('.md')) {
						try {
							const srcFile = path.join(sourceDir, filename);
							const destFile = path.join(destDir, filename);
							
							if (fs.existsSync(srcFile)) {
								const content = fs.readFileSync(srcFile, 'utf-8');
								fs.writeFileSync(destFile, content, 'utf-8');
								console.log(`[Sync Yuwen] Synced updated file: ${filename}`);
							}
						} catch (err) {
							console.error(`[Sync Yuwen Error] Failed to auto-sync updated file ${filename}:`, err);
						}
					}
				});
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), syncYuwenPlugin()]
});

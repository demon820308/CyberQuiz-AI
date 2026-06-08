import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Vite plugin to sync E:\yuwen folder to src/lib/data/yuwen in local development
function cleanMarkdownContent(content: string, fileName: string): string {
	let clean = content;
	
	// Remove redundant global top header
	clean = clean.replace(/# 《中考语文阅读理解知识库 PRO MAX》\s*\r?\n/g, '');
	clean = clean.replace(/# 《中考语文阅读理解知识库 PRO MAX》\s*/g, '');

	// Clean colon newlines (e.g. 作用：\n\n描述 -> 作用：描述)
	clean = clean.replace(/(作用|含义|例句|特点|原因|常表达|常见题型|答题模板|模板|建议)[：:]\s*\r?\n\s*([^\r\n]+)/g, '$1：$2');

	// Strip "（教辅书版）" or other subtitles from the main # headers, but we can put them into a tip block or similar
	if (fileName.includes('第一卷')) {
		// Replace "# 第一卷：现代文阅读大全（教辅书版）" with clean title and tip block (if tip is not already there)
		if (!clean.includes('**教辅版本**：教辅书版同步精讲')) {
			clean = clean.replace(/# 第一卷：现代文阅读大全（教辅书版）/g, '# 第一卷：现代文阅读大全\n\n> **教辅版本**：教辅书版同步精讲\n\n');
		} else {
			clean = clean.replace(/# 第一卷：现代文阅读大全（教辅书版）/g, '# 第一卷：现代文阅读大全\n\n');
		}
	} else if (fileName.includes('第三卷')) {
		if (!clean.includes('**教辅版本**：中考版同步精讲')) {
			clean = clean.replace(/# 第三卷：文言文阅读大全 PRO MAX（中考版）/g, '# 第三卷：文言文阅读大全 PRO MAX\n\n> **教辅版本**：中考版同步精讲\n\n');
		} else {
			clean = clean.replace(/# 第三卷：文言文阅读大全 PRO MAX（中考版）/g, '# 第三卷：文言文阅读大全 PRO MAX\n\n');
		}
	}
	
	// Normalize line endings
	clean = clean.replace(/\r\n/g, '\n');
	
	// Compress excessive empty lines
	clean = clean.replace(/\n{3,}/g, '\n\n');
	
	return clean;
}

// Vite plugin to sync E:\yuwen folder to src/lib/data/yuwen in local development
function syncYuwenPlugin() {
	const sourceDir = 'E:\\yuwen';
	const destDir = path.join(process.cwd(), 'src', 'lib', 'data', 'yuwen');

	const syncFiles = () => {
		if (fs.existsSync(sourceDir)) {
			console.log(`[Sync Yuwen] Syncing and cleaning files from "${sourceDir}" to "${destDir}"...`);
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
						const cleaned = cleanMarkdownContent(content, file);
						fs.writeFileSync(destFile, cleaned, 'utf-8');
						count++;
					}
				}
				console.log(`[Sync Yuwen] Success: Synced & cleaned ${count} files.`);
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
								const cleaned = cleanMarkdownContent(content, filename);
								fs.writeFileSync(destFile, cleaned, 'utf-8');
								console.log(`[Sync Yuwen] Synced and cleaned updated file: ${filename}`);
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

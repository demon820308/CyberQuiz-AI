import fs from 'fs';
import path from 'path';
import { parseReadingMarkdown } from '$lib/utils/readingParser';
import type { PageServerLoad } from './$types';

const volumeFiles: Record<string, string> = {
	volume1: '第一卷_现代文阅读大全_PRO_MAX.md',
	volume2: '第二卷_说明文与议论文阅读大全_PRO_MAX.md',
	volume3: '第三卷_文言文阅读大全_PRO_MAX.md',
	volume4: '第四卷_古诗词鉴赏大全_PRO_MAX.md',
	volume5: '第五卷：非连续性文本阅读 + 中考冲刺宝典 PRO MAX.md',
	volume6: '第六卷《中考阅读理解满分模板库 PRO MAX》.md',
};

export const load: PageServerLoad = async () => {
	const volumes = [];
	
	for (const [id, fileName] of Object.entries(volumeFiles)) {
		let fileContent = '';
		const localPath = path.join('E:', 'yuwen', fileName);
		const bundledPath = path.join(process.cwd(), 'src', 'lib', 'data', 'yuwen', fileName);
		
		// Attempt to read from E:\yuwen first for real-time local updates
		if (fs.existsSync(localPath)) {
			try {
				fileContent = fs.readFileSync(localPath, 'utf-8');
				// Sync to local project directory
				fs.writeFileSync(bundledPath, fileContent, 'utf-8');
			} catch (err) {
				console.error(`[Local Sync Error] Failed to read ${fileName}:`, err);
			}
		}
		
		// Fallback to bundled files if local path is not present
		if (!fileContent && fs.existsSync(bundledPath)) {
			try {
				fileContent = fs.readFileSync(bundledPath, 'utf-8');
			} catch (err) {
				console.error(`[Local Load Error] Failed to load bundled ${fileName}:`, err);
			}
		}
		
		if (fileContent) {
			const parsed = parseReadingMarkdown(fileContent, id, fileName);
			
			// Estimate reading time (Chinese reading speed is roughly 350-500 chars/min)
			const readingTimeMin = Math.max(5, Math.ceil(parsed.wordCount / 400));

			// Extract first chapter/intro sentence as description
			let desc = '精选考点及满分答题技巧';
			if (parsed.chapters.length > 0) {
				const firstChapterText = parsed.chapters[0].contentHtml;
				// Simple regex strip tags
				const clean = firstChapterText.replace(/<[^>]*>/g, '').trim().substring(0, 45);
				if (clean) desc = clean + '...';
			}

			volumes.push({
				id: parsed.id,
				title: parsed.title.replace(/《|》/g, ''),
				chapterCount: parsed.chapters.length,
				wordCount: parsed.wordCount,
				readingTime: readingTimeMin,
				desc
			});
		}
	}
	
	return {
		volumes
	};
};

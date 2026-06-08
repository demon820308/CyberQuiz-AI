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

export const load: PageServerLoad = async ({ params }) => {
	const { volumeId } = params;
	const fileName = volumeFiles[volumeId];
	if (!fileName) {
		throw new Error('未找到对应的卷资料');
	}

	let fileContent = '';
	const localPath = path.join('E:', 'yuwen', fileName);
	const bundledPath = path.join(process.cwd(), 'src', 'lib', 'data', 'yuwen', fileName);

	// Developer path priority read and sync
	if (fs.existsSync(localPath)) {
		try {
			fileContent = fs.readFileSync(localPath, 'utf-8');
			fs.writeFileSync(bundledPath, fileContent, 'utf-8');
		} catch (err) {
			console.error(`[Local Sync Error] Failed to read from E:\\yuwen:`, err);
		}
	}

	// Bundled path fallback
	if (!fileContent) {
		if (fs.existsSync(bundledPath)) {
			try {
				fileContent = fs.readFileSync(bundledPath, 'utf-8');
			} catch (err) {
				console.error(`[Local Load Error] Failed to load bundled file:`, err);
				throw new Error(`无法读取备份卷文件: ${fileName}`);
			}
		} else {
			throw new Error(`未找到备份卷文件: ${fileName}`);
		}
	}

	const volumeData = parseReadingMarkdown(fileContent, volumeId, fileName);

	return {
		volume: volumeData
	};
};

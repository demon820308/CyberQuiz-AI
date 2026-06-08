import volume1 from '$lib/data/yuwen/第一卷_现代文阅读大全_PRO_MAX.md?raw';
import volume2 from '$lib/data/yuwen/第二卷_说明文与议论文阅读大全_PRO_MAX.md?raw';
import volume3 from '$lib/data/yuwen/第三卷_文言文阅读大全_PRO_MAX.md?raw';
import volume4 from '$lib/data/yuwen/第四卷_古诗词鉴赏大全_PRO_MAX.md?raw';
import volume5 from '$lib/data/yuwen/第五卷：非连续性文本阅读 + 中考冲刺宝典 PRO MAX.md?raw';
import volume6 from '$lib/data/yuwen/第六卷《中考阅读理解满分模板库 PRO MAX》.md?raw';

import { parseReadingMarkdown } from '$lib/utils/readingParser';
import type { PageServerLoad } from './$types';

const volumesData = [
	{ id: 'volume1', fileName: '第一卷_现代文阅读大全_PRO_MAX.md', content: volume1 },
	{ id: 'volume2', fileName: '第二卷_说明文与议论文阅读大全_PRO_MAX.md', content: volume2 },
	{ id: 'volume3', fileName: '第三卷_文言文阅读大全_PRO_MAX.md', content: volume3 },
	{ id: 'volume4', fileName: '第四卷_古诗词鉴赏大全_PRO_MAX.md', content: volume4 },
	{ id: 'volume5', fileName: '第五卷：非连续性文本阅读 + 中考冲刺宝典 PRO MAX.md', content: volume5 },
	{ id: 'volume6', fileName: '第六卷《中考阅读理解满分模板库 PRO MAX》.md', content: volume6 }
];

export const load: PageServerLoad = async () => {
	const volumes = [];
	
	for (const { id, fileName, content } of volumesData) {
		const parsed = parseReadingMarkdown(content, id, fileName);
		
		// Estimate reading time
		const readingTimeMin = Math.max(5, Math.ceil(parsed.wordCount / 400));

		// Extract description
		let desc = '精选考点及满分答题技巧';
		if (parsed.chapters.length > 0) {
			const firstChapterText = parsed.chapters[0].contentHtml;
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
	
	return {
		volumes
	};
};

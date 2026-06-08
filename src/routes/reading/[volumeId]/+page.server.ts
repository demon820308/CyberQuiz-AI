import volume1 from '$lib/data/yuwen/第一卷_现代文阅读大全_PRO_MAX.md?raw';
import volume2 from '$lib/data/yuwen/第二卷_说明文与议论文阅读大全_PRO_MAX.md?raw';
import volume3 from '$lib/data/yuwen/第三卷_文言文阅读大全_PRO_MAX.md?raw';
import volume4 from '$lib/data/yuwen/第四卷_古诗词鉴赏大全_PRO_MAX.md?raw';
import volume5 from '$lib/data/yuwen/第五卷：非连续性文本阅读 + 中考冲刺宝典 PRO MAX.md?raw';
import volume6 from '$lib/data/yuwen/第六卷《中考阅读理解满分模板库 PRO MAX》.md?raw';

import { parseReadingMarkdown } from '$lib/utils/readingParser';
import type { PageServerLoad } from './$types';

const volumeContents: Record<string, string> = {
	volume1,
	volume2,
	volume3,
	volume4,
	volume5,
	volume6
};

const volumeFileNames: Record<string, string> = {
	volume1: '第一卷_现代文阅读大全_PRO_MAX.md',
	volume2: '第二卷_说明文与议论文阅读大全_PRO_MAX.md',
	volume3: '第三卷_文言文阅读大全_PRO_MAX.md',
	volume4: '第四卷_古诗词鉴赏大全_PRO_MAX.md',
	volume5: '第五卷：非连续性文本阅读 + 中考冲刺宝典 PRO MAX.md',
	volume6: '第六卷《中考阅读理解满分模板库 PRO MAX》.md',
};

export const load: PageServerLoad = async ({ params }) => {
	const { volumeId } = params;
	const content = volumeContents[volumeId];
	const fileName = volumeFileNames[volumeId];
	
	if (!content || !fileName) {
		throw new Error('未找到对应的卷资料');
	}

	const volumeData = parseReadingMarkdown(content, volumeId, fileName);

	return {
		volume: volumeData
	};
};

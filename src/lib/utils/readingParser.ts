export interface ReadingChapter {
	title: string;
	level: number;
	anchorId: string;
	contentHtml: string;
}

export interface ReadingVolume {
	id: string;
	title: string;
	fileName: string;
	chapters: ReadingChapter[];
	wordCount: number;
}

// Generates a unique anchor ID based on heading text
function generateAnchorId(text: string, index: number): string {
	const clean = text
		.trim()
		.toLowerCase()
		.replace(/[^\w\u4e00-\u9fa5]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `heading-${clean || 'section'}-${index}`;
}

// Highlight and style specific patterns in text paragraphs
function formatInlineStyles(text: string): string {
	if (!text) return '';
	let formatted = text.trim();

	// Format inline bold markers **text** into strong tag with primary accent
	formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-extrabold text-glow-primary">$1</strong>');

	// Format star rating bullets e.g. 中考考查频率：★★★★★
	formatted = formatted.replace(/(★+)/g, '<span class="text-amber-400 text-glow-amber select-none">$1</span>');

	return formatted;
}

// Parses formulas like "A + B + C = D" into a nice styled calculation box
function parseCalculationFormula(line: string): string {
	if (!line.includes('+') || !line.includes('=')) return '';
	
	const parts = line.split('=');
	if (parts.length !== 2) return '';
	
	const leftParts = parts[0].split('+').map(p => p.trim()).filter(Boolean);
	const rightPart = parts[1].trim();
	
	let html = `<div class="formula-card flex items-center justify-center flex-wrap gap-2.5 bg-secondary/5 border border-secondary/20 p-5 rounded-2xl text-sm font-extrabold text-secondary tracking-wide my-4 shadow-inner">`;
	
	leftParts.forEach((part, index) => {
		if (index > 0) {
			html += `<span class="text-secondary/60 text-lg font-bold select-none">+</span>`;
		}
		html += `<span class="px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 shadow-sm">${formatInlineStyles(part)}</span>`;
	});
	
	html += `<span class="material-symbols-outlined text-primary font-extrabold mx-1 select-none">double_arrow</span>`;
	html += `<span class="px-4 py-2 rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-200">${formatInlineStyles(rightPart)}</span>`;
	html += `</div>`;
	
	return html;
}

// Parses step flows like "A → B → C" or lines separated by Arrows
function parseStepFlow(steps: string[]): string {
	if (steps.length < 2) return '';
	
	let html = `<div class="step-flow-card flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-3 bg-surface-container-high/40 p-5 rounded-2xl border border-outline-variant/10 my-4 shadow-sm relative overflow-hidden max-w-full">`;
	// Decorative side lines
	html += `<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary"></div>`;
	
	steps.forEach((step, index) => {
		if (index > 0) {
			html += `<span class="hidden md:inline-flex items-center"><span class="material-symbols-outlined text-primary-variant/50 select-none text-sm">double_arrow</span></span>`;
			html += `<span class="md:hidden inline-flex items-center"><span class="material-symbols-outlined text-primary-variant/50 select-none text-sm">arrow_downward</span></span>`;
		}
		
		html += `<div class="flex items-center gap-2 bg-surface-container-lowest/60 px-3 py-2 rounded-xl border border-outline-variant/5 hover:border-primary/20 transition-all duration-300">`;
		html += `<span class="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold font-code select-none">${index + 1}</span>`;
		html += `<span class="font-bold text-on-surface text-sm">${formatInlineStyles(step)}</span>`;
		html += `</div>`;
	});
	
	html += `</div>`;
	return html;
}

// Helper to escape text for HTML attributes
function escapeHtmlAttr(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function cleanVolumeTitle(title: string): string {
	const clean = title.trim();
	if (clean.includes('第一卷')) return '第一卷：现代文阅读大全';
	if (clean.includes('第二卷')) return '第二卷：说明文＋议论文阅读大全';
	if (clean.includes('第三卷')) return '第三卷：文言文阅读大全';
	if (clean.includes('第四卷')) return '第四卷：古诗词鉴赏大全';
	if (clean.includes('第五卷')) return '第五卷：非连续性文本阅读 + 中考冲刺宝典';
	if (clean.includes('第六卷')) return '第六卷：中考阅读理解满分模板库';
	
	return clean.replace(/^#+\s*/, '').replace(/《|》/g, '').replace(/_/g, ' ').replace(/PRO\s*MAX/gi, '').trim();
}

export function parseReadingMarkdown(mdContent: string, volumeId: string, fileName: string): ReadingVolume {
	let cleanMd = mdContent;
	// Clean colon newlines (e.g. 作用：\n\n描述 -> 作用：描述)
	cleanMd = cleanMd.replace(/(作用|含义|例句|特点|原因|常表达|常见题型|答题模板|模板|建议)[：:]\s*\r?\n\s*([^\r\n]+)/g, '$1：$2');

	const lines = cleanMd.split(/\r?\n/);
	const chapters: ReadingChapter[] = [];
	
	let currentTitle = '';
	let currentLevel = 1;
	let currentLines: string[] = [];
	let headingIndex = 0;

	// Establish document title
	let docTitle = fileName.replace(/\.md$/, '').replace(/_/g, ' ');

	const commitChapter = () => {
		if (currentLines.length > 0 || currentTitle) {
			const rawText = currentLines.join('\n');
			const contentHtml = renderMarkdownToHtml(rawText);
			
			// If it's the very first part and has no title, use the document title
			const title = currentTitle || docTitle;
			
			chapters.push({
				title,
				level: currentLevel,
				anchorId: generateAnchorId(title, headingIndex++),
				contentHtml
			});
		}
		currentLines = [];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// Detect heading line (e.g. # Chapter 1, ## Section 2)
		if (trimmed.startsWith('#') && !trimmed.startsWith('###')) {
			const match = line.match(/^(#{1,5})\s+(.*)$/);
			if (match) {
				const hashes = match[1];
				const hText = match[2].trim();
				const level = hashes.length;

				// Skip document title headers if they're redundant at the very start
				if (level === 1) {
					// Correctly extract volume names e.g. 第一卷, 第二卷
					const volMatch = hText.match(/第[一二三四五六]卷/);
					if (volMatch) {
						docTitle = hText;
					} else if (hText.includes('中考语文阅读理解') || hText.includes('卷结束') || hText.includes('册')) {
						// Generic titles or ends, skip committing as a chapter
						currentTitle = hText;
						currentLevel = level;
						continue;
					}
				}

				// Commit previous chapter
				commitChapter();

				currentTitle = hText;
				currentLevel = level;
				continue;
			}
		}

		currentLines.push(line);
	}

	// Commit last chapter
	commitChapter();

	// Calculate word count
	const rawAllText = lines.join('');
	const wordCount = rawAllText.replace(/[^\u4e00-\u9fa5]/g, '').length;

	return {
		id: volumeId,
		title: cleanVolumeTitle(docTitle),
		fileName,
		chapters,
		wordCount
	};
}

// Render markdown blocks to styled HTML
function renderMarkdownToHtml(markdown: string): string {
	const lines = markdown.split(/\r?\n/);
	let html = '';
	
	let listItems: string[] = [];
	let inList = false;
	let inQuote = false;
	let quoteLines: string[] = [];

	const flushList = () => {
		if (listItems.length === 0) return;
		
		// Check if list items are very short (e.g., all items are <= 8 characters)
		// If so, render as an inline tag cloud grid
		const isShortTags = listItems.every(item => item.replace(/<[^>]*>/g, '').trim().length <= 8);
		
		if (isShortTags) {
			html += `<div class="flex flex-wrap gap-2.5 my-4">`;
			listItems.forEach(item => {
				html += `<span class="px-3.5 py-1.5 bg-primary/5 border border-primary/15 hover:border-primary/40 hover:bg-primary/10 text-primary text-sm font-semibold rounded-xl tracking-wide shadow-sm hover:scale-105 transition-all duration-200 cursor-help select-all">${item}</span>`;
			});
			html += `</div>`;
		} else {
			html += `<ul class="space-y-2.5 my-4 pl-5 list-none">`;
			listItems.forEach(item => {
				html += `<li class="relative pl-5 text-[14px] leading-relaxed text-on-surface-variant font-medium">`;
				html += `<span class="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>`;
				html += `<span>${item}</span>`;
				html += `</li>`;
			});
			html += `</ul>`;
		}
		
		listItems = [];
		inList = false;
	};

	const flushQuote = () => {
		if (quoteLines.length === 0) return;
		const quoteText = quoteLines.join('\n');
		
		// Format quotes as decorative tip blocks
		html += `<div class="my-4 bg-primary/5 border-l-4 border-primary p-4.5 rounded-r-2xl relative overflow-hidden">`;
		html += `<div class="absolute -right-4 -top-4 w-12 h-12 bg-primary/5 rounded-full"></div>`;
		html += `<p class="text-xs font-bold text-primary uppercase tracking-widest mb-1 select-none flex items-center gap-1.5">`;
		html += `<span class="material-symbols-outlined text-[15px]">tips_and_updates</span>学霸备考建议</p>`;
		html += `<div class="text-[13px] leading-relaxed text-on-surface-variant font-medium whitespace-pre-line">${formatInlineStyles(quoteText)}</div>`;
		html += `</div>`;
		
		quoteLines = [];
		inQuote = false;
	};

	// ── Pre-scanning for templates & step-flows ──────────────────────────────
	// Volume 6 templates can span multiple lines separated by empty spaces.
	// We can group lines together if they contain "……" or "××".
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		// Handle empty lines
		if (!trimmed) {
			if (inList) flushList();
			if (inQuote) flushQuote();
			i++;
			continue;
		}

		// Handle horizontal rules (e.g. ---) to prevent them from being parsed as list items and turned into `--` badges
		if (trimmed === '---' || trimmed === '***' || trimmed === '___' || /^[-*_]{3,}$/.test(trimmed)) {
			if (inList) flushList();
			if (inQuote) flushQuote();
			html += `<hr class="my-6 border-t border-outline-variant/15" />`;
			i++;
			continue;
		}

		// Handle blockquotes
		if (trimmed.startsWith('>')) {
			if (inList) flushList();
			inQuote = true;
			quoteLines.push(trimmed.substring(1).trim());
			i++;
			continue;
		} else if (inQuote) {
			flushQuote();
		}

		// Handle List Items
		if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('+')) {
			const content = trimmed.replace(/^[-*+]\s*/, '');
			
			// Detect if this list item is a template
			if (content.includes('……') || content.includes('××')) {
				if (inList) flushList();
				html += renderTemplateCard(content);
			} else {
				inList = true;
				listItems.push(formatInlineStyles(content));
			}
			i++;
			continue;
		} else if (inList) {
			// Check if list continues on next lines
			if (!trimmed.startsWith('-') && !trimmed.startsWith('*') && !trimmed.startsWith('+')) {
				// If not a list item, flush list first
				flushList();
			}
		}

		// Handle headings in inline rendering (H3, H4)
		if (trimmed.startsWith('###')) {
			const headerText = trimmed.replace(/^###+\s*/, '');
			
			// Render specific headers with cool side borders
			if (headerText.includes('模板') || headerText.includes('题型') || headerText.includes('核心')) {
				html += `<h4 class="text-md font-extrabold text-primary flex items-center gap-2 mt-6 mb-3 border-l-3 border-primary pl-2.5 tracking-tight">${formatInlineStyles(headerText)}</h4>`;
			} else if (headerText.includes('失分') || headerText.includes('避坑') || headerText.includes('注意')) {
				html += `<h4 class="text-md font-extrabold text-error flex items-center gap-2 mt-6 mb-3 border-l-3 border-error pl-2.5 tracking-tight">${formatInlineStyles(headerText)}</h4>`;
			} else {
				html += `<h4 class="text-sm font-extrabold text-on-surface flex items-center gap-2 mt-6 mb-2.5">${formatInlineStyles(headerText)}</h4>`;
			}
			i++;
			continue;
		}

		// Detect inline "答题公式" and "满分公式" mathematical additions
		if (trimmed.includes('+') && trimmed.includes('=') && (trimmed.includes('公式') || i > 0 && lines[i-1].includes('公式') || lines[i-1].includes('得分'))) {
			html += parseCalculationFormula(trimmed);
			i++;
			continue;
		}

		// Detect single-line step flow, e.g. "本义 → 语境义 → 效果"
		if (trimmed.includes('→')) {
			const steps = trimmed.split('→').map(s => s.trim()).filter(Boolean);
			html += parseStepFlow(steps);
			i++;
			continue;
		}

		// Detect multi-line step flow, e.g.
		// Item
		// ↓
		// Item2
		if (i + 1 < lines.length && lines[i+1].trim() === '↓') {
			const steps: string[] = [];
			steps.push(trimmed);
			i += 2; // skip current and down arrow
			
			while (i < lines.length) {
				const nextTrimmed = lines[i].trim();
				if (!nextTrimmed) {
					i++;
					continue;
				}
				
				steps.push(nextTrimmed);
				
				if (i + 1 < lines.length && lines[i+1].trim() === '↓') {
					i += 2; // skip next arrow and continue loop
				} else {
					i++;
					break;
				}
			}
			
			html += parseStepFlow(steps);
			continue;
		}

		// Detect template cards from plain paragraphs containing "……" or "××"
		if (trimmed.includes('……') || trimmed.includes('××')) {
			// Check if we have consecutive template lines
			let templateText = trimmed;
			let nextI = i + 1;
			while (nextI < lines.length) {
				const nextTrimmed = lines[nextI].trim();
				if (!nextTrimmed) {
					nextI++;
					continue;
				}
				if (nextTrimmed.includes('……') || nextTrimmed.includes('××')) {
					templateText += '\n' + nextTrimmed;
					nextI++;
				} else {
					break;
				}
			}
			
			html += renderTemplateCard(templateText);
			i = nextI;
			continue;
		}

		// Detect Warnings / Common errors card
		if (trimmed.startsWith('常见失分原因') || trimmed.startsWith('避坑提示') || trimmed.includes('失分原因：')) {
			let errorText = trimmed.replace(/^常见失分原因[：:]?|避坑提示[：:]?/, '');
			let nextI = i + 1;
			let gatheredBullets: string[] = [];
			
			if (errorText) gatheredBullets.push(errorText);
			
			while (nextI < lines.length) {
				const nextTrimmed = lines[nextI].trim();
				if (!nextTrimmed) {
					nextI++;
					continue;
				}
				if (nextTrimmed.startsWith('-') || nextTrimmed.startsWith('*')) {
					gatheredBullets.push(nextTrimmed.replace(/^[-*]\s*/, ''));
					nextI++;
				} else {
					break;
				}
			}
			
			html += `<div class="error-warning-card bg-error/5 border border-error/20 p-5 rounded-2xl my-4 relative overflow-hidden">`;
			html += `<div class="absolute -right-4 -top-4 w-12 h-12 bg-error/5 rounded-full"></div>`;
			html += `<div class="flex items-center gap-2 text-error font-extrabold text-[14px] mb-3">`;
			html += `<span class="material-symbols-outlined text-[20px]">report</span>`;
			html += `<span>避坑警示栏 / 常见失分防范</span>`;
			html += `</div>`;
			html += `<ul class="space-y-2">`;
			gatheredBullets.forEach(bullet => {
				html += `<li class="flex items-start gap-2 text-sm font-semibold text-on-surface-variant">`;
				html += `<span class="text-error font-bold select-none">❌</span>`;
				html += `<span>${formatInlineStyles(bullet)}</span>`;
				html += `</li>`;
			});
			html += `</ul>`;
			html += `</div>`;
			
			i = nextI;
			continue;
		}

		// Normal paragraph text
		html += `<p class="text-on-surface-variant/90 text-sm leading-relaxed text-justify mt-3.5 mb-2 font-medium">${formatInlineStyles(trimmed)}</p>`;
		i++;
	}

	// Flush any dangling lists or quotes
	if (inList) flushList();
	if (inQuote) flushQuote();

	return html;
}

function renderTemplateCard(text: string): string {
	// Format the blank dots into styled input-like underlines
	let cleanText = formatInlineStyles(text);
	
	// Replace blanks e.g. "……" or "______" with clean dashed underline (no text underscores underneath)
	cleanText = cleanText.replace(/(……|______)/g, '<span class="border-b border-dashed border-primary px-6 py-0.5 text-primary text-xs mx-1 font-extrabold select-all">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>');
	// Replace placeholders like "××" with simple text styling, removing pill badge borders/bg to prevent button confusion
	cleanText = cleanText.replace(/(××)/g, '<span class="text-primary font-extrabold mx-0.5">$1</span>');
	
	// Create inline code block styled template text
	const escapedText = escapeHtmlAttr(text);

	let cardHtml = `<div class="template-card relative my-4.5 p-5 border border-dashed border-primary/20 hover:border-primary/45 bg-surface-container-high/40 hover:bg-surface-container-high/60 rounded-2xl transition-all duration-300 shadow-sm">`;
	cardHtml += `<div class="template-text text-sm font-semibold text-on-surface leading-relaxed whitespace-pre-line">${cleanText}</div>`;
	cardHtml += `</div>`;
	
	return cardHtml;
}

import { NextRequest, NextResponse } from 'next/server';
import { getBookById } from '@/lib/dailyBooks';
import path from 'path';
import fs from 'fs';
import EPub from 'epub2';

interface ReadingResult {
    content: string;
    monthIntro?: string;
    monthTheme?: string;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const dayOfYear = parseInt(searchParams.get('day') || '1', 10);

    if (!bookId) {
        return NextResponse.json({ error: 'Missing bookId parameter' }, { status: 400 });
    }

    // Validate day of year
    const now = new Date();
    const currentYear = now.getFullYear();
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
    const maxDayOfYear = isLeapYear ? 366 : 365;

    if (isNaN(dayOfYear) || dayOfYear < 1 || dayOfYear > maxDayOfYear) {
        return NextResponse.json(
            { error: `Invalid day parameter. Must be between 1 and ${maxDayOfYear} for ${currentYear}.` },
            { status: 400 }
        );
    }

    const book = getBookById(bookId);
    if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const epubPath = path.join(process.cwd(), 'books', book.epubFile);

    if (!fs.existsSync(epubPath)) {
        return NextResponse.json({ error: 'Epub file not found' }, { status: 404 });
    }

    try {
        const result = await extractDailyContent(epubPath, dayOfYear, book.id);

        // Add cache control headers to ensure daily refresh
        // Cache for 1 hour, but allow revalidation
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600, must-revalidate',
            'Vary': 'Accept-Encoding'
        });

        return NextResponse.json({
            bookId: book.id,
            title: book.title,
            author: book.author,
            day: dayOfYear,
            content: result.content,
            monthIntro: result.monthIntro,
            monthTheme: result.monthTheme
        }, { headers });
    } catch (error) {
        console.error('Error parsing epub:', error);
        return NextResponse.json(
            { error: 'Failed to parse epub', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Get the date string patterns to search for
function getDatePatterns(dayOfYear: number): string[] {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, 0, dayOfYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[date.getMonth()];
    const dayOfMonth = date.getDate();

    // Generate ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinal = (n: number): string => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Known typos in Calendar of Wisdom EPUB (e.g., "Januarys" instead of "January")
    const monthTypos: Record<string, string[]> = {
        'January': ['Januarys', 'Janury'],
        'February': ['Februarys', 'Febuary'],
        'March': ['Marchs'],
        'April': ['Aprils'],
        'May': ['Mays'],
        'June': ['Junes'],
        'July': ['Julys'],
        'August': ['Augusts'],
        'September': ['Septembers'],
        'October': ['Octobers'],
        'November': ['Novembers'],
        'December': ['Decembers'],
    };

    const patterns = [
        `${monthName} ${getOrdinal(dayOfMonth)}`, // "January 1st"
        `${monthName} ${dayOfMonth}`,              // "January 1"
        `${monthName.toUpperCase()} ${dayOfMonth}`, // "JANUARY 1"
        `${dayOfMonth} ${monthName}`,              // "1 January"
    ];

    // Add typo patterns for the current month
    const typos = monthTypos[monthName] || [];
    for (const typo of typos) {
        patterns.push(`${typo} ${dayOfMonth}`);    // "Januarys 13"
        patterns.push(`${typo} ${getOrdinal(dayOfMonth)}`); // "Januarys 13th"
    }

    return patterns;
}

interface EpubChapter {
    id?: string;
    title?: string;
}

function extractDailyContent(epubPath: string, dayOfYear: number, bookId: string): Promise<ReadingResult> {
    return new Promise((resolve, reject) => {
        const epub = new EPub(epubPath);

        epub.on('error', (err: Error) => {
            reject(err);
        });

        epub.on('end', async () => {
            try {
                const chapters: EpubChapter[] = epub.flow || [];
                const datePatterns = getDatePatterns(dayOfYear);
                const nextDatePatterns = getDatePatterns(dayOfYear + 1); // For finding the end of the day's content

                // Get month info
                const date = new Date(new Date().getFullYear(), 0, dayOfYear);
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[date.getMonth()];

                // ... Daily Laws month intro logic (kept same as before, simplified here to focus on change) ...
                let monthIntro = '';
                let monthTheme = '';
                if (bookId === 'daily-laws') {
                    for (const chapter of chapters) {
                        if (!chapter.id) continue;
                        const content = await getChapterContent(epub, chapter.id);
                        if (content) {
                            if (content.length < 2000 || isTOC(content)) continue;
                            // Generalized check for Monthly Overview chapter
                            // 1. Must contain the Month Name as a standalone header (h1-h2) or prominent text
                            // Note: headers often contain spans or other tags, so use [\s\S]*?
                            const monthHeaderRegex = new RegExp(`<h[1-2][^>]*>[\\s\\S]*?${monthName}[\\s\\S]*?</h[1-2]>`, 'i');

                            // 2. Must NOT be a daily entry (e.g., "February 1")
                            const dayPattern = new RegExp(`${monthName}\\s+\\d+`, 'i');
                            const isDailyEntry = dayPattern.test(content);

                            if (monthHeaderRegex.test(content) && !isDailyEntry) {
                                // Extract theme from the next header(s)
                                // Structure is usually: H1(Month) -> H1(Title) -> H1(Subtitle)
                                const themeMatch = content.match(new RegExp(`<h[1-2][^>]*>[\\s\\S]*?${monthName}[\\s\\S]*?<\\/h[1-2]>\\s*<h[1-2][^>]*>([^<]+)<\\/h[1-2]>`, 'i'));

                                if (themeMatch) {
                                    monthTheme = themeMatch[1].trim();
                                } else {
                                    // Fallback: try to find the next header
                                    const nextHeader = content.match(/<h[1-2][^>]*>([^<]+)<\/h[1-2]>/g);
                                    if (nextHeader && nextHeader[1]) {
                                        // stripping tags for theme name
                                        monthTheme = nextHeader[1].replace(/<\/?h[1-2][^>]*>/g, '').trim();
                                    }
                                }

                                monthIntro = cleanHtmlContent(content);

                                // 1. Remove the redundant Month Name header
                                const monthHeaderRemovalRegex = new RegExp(`<h[1-2][^>]*>[\\s\\S]*?${monthName}[\\s\\S]*?</h[1-2]>\\s*`, 'i');
                                monthIntro = monthIntro.replace(monthHeaderRemovalRegex, '');

                                // 2. Improve formatting: Hierarchy for Title vs Subtitle
                                // The remaining content likely has <h1>Title</h1> <h1>Subtitle</h1>
                                // We keep the 1st H1 as H1 (Title), and demote the 2nd H1 to H2 (Subtitle)
                                let h1Count = 0;
                                monthIntro = monthIntro.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (match, inner) => {
                                    h1Count++;
                                    if (h1Count === 2) {
                                        return `<h2>${inner}</h2>`;
                                    }
                                    return match;
                                });
                                break;
                            }
                        }
                    }
                }

                // Search for the specific day's content
                for (const chapter of chapters) {
                    if (!chapter.id) continue;
                    const content = await getChapterContent(epub, chapter.id);
                    if (!content) continue;

                    // Check if this chapter contains the date we're looking for
                    for (const pattern of datePatterns) {
                        // Look for date as a heading or prominent text
                        // We use strict regexes to avoid matching "January 1" inside "January 10"
                        // But since we are looking for >pattern< or similar, it helps. 
                        // For finding positions, simple index methods are safer IF we check context.

                        // Use lookarounds to ensure we don't match "January 2" inside "January 21"
                        const pSafe = `(?<!\\d)${pattern}(?!\\d)`;

                        const headingRegex = new RegExp(`<h[1-6][^>]*>(?:(?!<h[1-6][^>]*>)[\\s\\S])*?${pSafe}[\\s\\S]*?</h[1-6]>`, 'i');
                        const prominentRegex = new RegExp(`<p[^>]*>(?:(?!<p[^>]*>)[\\s\\S])*?${pSafe}[\\s\\S]*?</p>`, 'i');
                        const simpleRegex = new RegExp(`>${pSafe}<`, 'i');

                        if (headingRegex.test(content) || prominentRegex.test(content) || simpleRegex.test(content)) {
                            // Make sure it's real content (> 200 chars) and not just a TOC reference
                            if (content.length > 200 && !isTOC(content)) {

                                // FOUND THE CHAPTER
                                // Now, for Calendar of Wisdom (and potentially others), check if we need to slice
                                // If the chapter contains the NEXT day, we must slice.

                                let finalContent = content;
                                let matchIndex = -1;

                                // Find the BEST match index for the current date
                                // We prioritize the regex match position
                                const match = headingRegex.exec(content) || prominentRegex.exec(content) || simpleRegex.exec(content);
                                if (match) {
                                    matchIndex = match.index;
                                }

                                if (matchIndex !== -1) {
                                    // Look for the next day to define the end boundary
                                    let nextDateIndex = -1;

                                    // Helper to find next day index
                                    const findNextDate = () => {
                                        for (const nextPat of nextDatePatterns) {
                                            const npSafe = `(?<!\\d)${nextPat}(?!\\d)`;
                                            const nextHeading = new RegExp(`<h[1-6][^>]*>(?:(?!<h[1-6][^>]*>)[\\s\\S])*?${npSafe}[\\s\\S]*?</h[1-6]>`, 'i');
                                            const nextProm = new RegExp(`<p[^>]*>(?:(?!<p[^>]*>)[\\s\\S])*?${npSafe}[\\s\\S]*?</p>`, 'i');
                                            const nextSimple = new RegExp(`>${npSafe}<`, 'i');

                                            const m = nextHeading.exec(content) || nextProm.exec(content) || nextSimple.exec(content);
                                            if (m && m.index > matchIndex) return m.index;
                                        }
                                        return -1;
                                    }

                                    nextDateIndex = findNextDate();

                                    // Special handling for end of month/book? 
                                    // If nextDateIndex is -1, it might be the last day in the chapter.
                                    // So we just take from matchIndex to end.

                                    if (nextDateIndex !== -1) {
                                        finalContent = content.substring(matchIndex, nextDateIndex);
                                    } else {
                                        // If we found the start, but not the next day, assume it goes to the end of chapter (or next significant header if we were smarter, but end of chapter is safe for month-based chapters)
                                        finalContent = content.substring(matchIndex);
                                    }
                                }

                                resolve({
                                    content: cleanHtmlContent(finalContent),
                                    monthIntro: monthIntro || undefined,
                                    monthTheme: monthTheme || undefined
                                });
                                return;
                            }
                        }
                    }
                }

                // Fallback: use chapter index approach (kept for backup)
                const config = getBookConfig(bookId);
                const chapterIndex = config.startChapter + dayOfYear - 1;
                // ... fallback logic ...
                if (chapterIndex < chapters.length && chapters[chapterIndex]?.id) {
                    const content = await getChapterContent(epub, chapters[chapterIndex].id!);
                    if (content) {
                        resolve({
                            content: cleanHtmlContent(content),
                            monthIntro: monthIntro || undefined,
                            monthTheme: monthTheme || undefined
                        });
                        return;
                    }
                }

                resolve({ content: 'Content not found for this day.' });
            } catch (err) {
                reject(err);
            }
        });

        epub.parse();
    });
}

function getChapterContent(epub: EPub, chapterId: string): Promise<string | null> {
    return new Promise((resolve) => {
        epub.getChapter(chapterId, (err: Error, text?: string) => {
            if (err || !text) {
                resolve(null);
            } else {
                resolve(text);
            }
        });
    });
}

function getBookConfig(bookId: string): { startChapter: number } {
    const configs: Record<string, { startChapter: number }> = {
        'daily-stoic': { startChapter: 4 },
        'daily-laws': { startChapter: 3 },
        'daily-drucker': { startChapter: 4 },
        'calendar-of-wisdom': { startChapter: 6 }
    };
    return configs[bookId] || { startChapter: 3 };
}

function isTOC(content: string): boolean {
    const lower = content.toLowerCase();
    const linkCount = (content.match(/<a /gi) || []).length;

    // Check for standard TOC indicators
    if (linkCount > 10 || (lower.includes('contents') && linkCount > 3)) {
        return true;
    }

    // Check for Name Index or Author Index sections
    // These contain date references like "January 13; February 11" for cross-referencing
    // but aren't actual daily content
    const indexPatterns = [
        'name index',
        'author index',
        'subject index',
        'index of names',
        'index of authors',
        'alphabetical index'
    ];

    for (const pattern of indexPatterns) {
        if (lower.includes(pattern)) {
            return true;
        }
    }

    // Additional heuristic: if content has many semicolon-separated date lists
    // (e.g., "January 13; February 11; March 2;"), it's likely an index
    const dateListPattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+[;,]/gi;
    const dateListMatches = content.match(dateListPattern) || [];
    if (dateListMatches.length > 20) {
        return true;
    }

    return false;
}

function cleanHtmlContent(html: string): string {
    let clean = html;

    // Remove script and style tags
    clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove images
    clean = clean.replace(/<img[^>]*>/gi, '');

    // Remove links but keep text
    clean = clean.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');

    // Keep basic formatting tags, remove attributes
    clean = clean.replace(/<(\w+)[^>]*>/g, (match, tag) => {
        const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'em', 'strong', 'i', 'b', 'blockquote', 'ul', 'ol', 'li'];
        if (allowedTags.includes(tag.toLowerCase())) {
            return `<${tag}>`;
        }
        // Convert div to p to preserve block structure
        if (tag.toLowerCase() === 'div') {
            return '<p>';
        }
        if (tag.toLowerCase() === 'span') {
            return '';
        }
        return '';
    });

    // Clean up closing tags
    clean = clean.replace(/<\/(\w+)>/g, (match, tag) => {
        const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'em', 'strong', 'i', 'b', 'blockquote', 'ul', 'ol', 'li'];
        if (allowedTags.includes(tag.toLowerCase())) {
            return `</${tag}>`;
        }
        if (tag.toLowerCase() === 'div') {
            return '</p>';
        }
        return '';
    });

    // Clean up excessive whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Remove empty paragraphs
    clean = clean.replace(/<p>\s*<\/p>/g, '');
    clean = clean.replace(/<p>\s*&nbsp;\s*<\/p>/g, '');

    // Remove OceanofPDF watermarks
    clean = clean.replace(/<p>\s*<i>OceanofPDF\.com<\/i>\s*<\/p>/gi, '');
    clean = clean.replace(/<i>OceanofPDF\.com<\/i>/gi, '');
    clean = clean.replace(/OceanofPDF\.com/gi, '');
    clean = clean.replace(/<p>\s*<em>OceanofPDF\.com<\/em>\s*<\/p>/gi, '');

    // Remove date headers (e.g., "January 1", "2 January", "Januarys 13")
    // These are redundant as they are shown in the modal header
    // Include common typos found in some EPUBs (e.g., Calendar of Wisdom has "Januarys 13")
    const allMonthVariants = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
        'Januarys', 'Janury', 'Februarys', 'Febuary', 'Marchs', 'Aprils',
        'Mays', 'Junes', 'Julys', 'Augusts', 'Septembers', 'Octobers',
        'Novembers', 'Decembers'
    ];

    for (const month of allMonthVariants) {
        const patterns = [
            // Month Day (e.g., "January 2nd", "January 2")
            `(${month}\\s+\\d{1,2}(?:st|nd|rd|th)?)`,
            // Day Month (e.g., "2 January")
            `(\\d{1,2}(?:st|nd|rd|th)?\\s+${month})`
        ];

        for (const pat of patterns) {
            // 1. Heading with BR pattern: <hX>Date<br>Title</hX> -> <hX>Title</hX>
            // capturing group $1 is the opening tag <hX>
            const headingRegex = new RegExp(`(<h[1-6][^>]*>)\\s*` + pat + `\\s*<br\\s*\/?>\\s*`, 'gi');
            clean = clean.replace(headingRegex, '$1');

            // 2. Standalone Date in P or H tags: <p>Date</p> -> empty
            const pRegex = new RegExp(`<(?:p|h[1-6])[^>]*>\\s*` + pat + `\\s*<\/(?:p|h[1-6])>`, 'gi');
            clean = clean.replace(pRegex, '');
        }
    }

    // Format author attributions with proper spacing (wrap em-dashes with proper styling)
    clean = clean.replace(/<p>\s*—([^<]+)<\/p>/g, '<p class="author-attribution">—$1</p>');
    clean = clean.replace(/<p>—/g, '<p class="author-attribution">—');

    // Wrap "ACTION POINT:" sections
    // Matches "ACTION POINT:" at start of paragraph (or inside standard tags)
    clean = clean.replace(/<p>\s*(?:ACTION POINT|Action Point|ACTION STEP|Action Step):\s*(.*?)<\/p>/gi, '<div class="action-point"><strong>Action Point:</strong> $1</div>');

    // Also handle case where Action Point might be in an H tag or just strong text
    clean = clean.replace(/<(?:p|div)[^>]*>\s*<strong>\s*(?:ACTION POINT|Action Point):\s*<\/strong>\s*(.*?)<\/(?:p|div)>/gi, '<div class="action-point"><strong>Action Point:</strong> $1</div>');

    // Wrap likely source citations at the bottom (often year or book titles)
    // Heuristic: Last few paragraphs, short text, often contains dates or "The ..."
    // This is tricky to do perfectly with regex without affecting content, so we'll be conservative.
    // For now, let's target specific known patterns if possible, or just the very last line if it looks like a source.

    return clean;
}

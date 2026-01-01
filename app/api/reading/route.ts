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
        return NextResponse.json({
            bookId: book.id,
            title: book.title,
            author: book.author,
            day: dayOfYear,
            content: result.content,
            monthIntro: result.monthIntro,
            monthTheme: result.monthTheme
        });
    } catch (error) {
        console.error('Error parsing epub:', error);
        return NextResponse.json({ error: 'Failed to parse epub' }, { status: 500 });
    }
}

// Get the date string patterns to search for
function getDatePatterns(dayOfYear: number): string[] {
    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
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

    return [
        `${monthName} ${getOrdinal(dayOfMonth)}`, // "January 1st"
        `${monthName} ${dayOfMonth}`,              // "January 1"
        `${monthName.toUpperCase()} ${dayOfMonth}`, // "JANUARY 1"
        `${dayOfMonth} ${monthName}`,              // "1 January"
    ];
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

                // Get month info
                const date = new Date(new Date().getFullYear(), 0, dayOfYear);
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[date.getMonth()];

                // For Daily Laws, find the month intro chapter
                let monthIntro = '';
                let monthTheme = '';
                if (bookId === 'daily-laws') {
                    for (const chapter of chapters) {
                        if (!chapter.id) continue;
                        const content = await getChapterContent(epub, chapter.id);
                        if (content) {
                            // Skip short chapters and TOC chapters
                            if (content.length < 2000 || isTOC(content)) continue;

                            // Look for chapter that has the month name prominently but NOT a day entry
                            const hasMonthName = content.toLowerCase().includes(`>${monthName.toLowerCase()}<`) ||
                                new RegExp(`<h[1-3][^>]*>[^<]*${monthName}[^<]*</h[1-3]>`, 'i').test(content);

                            // Check if this is a daily entry (has "January 1" or "JANUARY 1" format)
                            const dayPattern = new RegExp(`${monthName}\\s+\\d+`, 'i');
                            const isDailyEntry = dayPattern.test(content);

                            // Also look for "Your Life's Task" or similar theme indicators
                            const hasThemeIndicator = content.toLowerCase().includes("life's task") ||
                                content.toLowerCase().includes('planting the seeds') ||
                                content.toLowerCase().includes('all of us are born unique');

                            if (hasMonthName && !isDailyEntry && hasThemeIndicator) {
                                // Extract the theme
                                const themeMatch = content.match(/<em>([^<]{5,60})<\/em>/i) ||
                                    content.match(/<h[2-4][^>]*>([^<]*(?:Life's Task|Your Life)[^<]*)<\/h[2-4]>/i);
                                if (themeMatch) {
                                    monthTheme = themeMatch[1].trim().replace(/\s+/g, ' ');
                                }
                                monthIntro = cleanHtmlContent(content);
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
                        const headingRegex = new RegExp(`<h[1-6][^>]*>[^<]*${pattern}[^<]*</h[1-6]>`, 'i');
                        const prominentRegex = new RegExp(`<p[^>]*>[^<]*<[^>]*>${pattern}`, 'i');
                        const simpleRegex = new RegExp(`>${pattern}<`, 'i');

                        if (headingRegex.test(content) || prominentRegex.test(content) || simpleRegex.test(content)) {
                            // Make sure it's real content (> 200 chars) and not just a TOC reference
                            if (content.length > 200 && !isTOC(content)) {
                                resolve({
                                    content: cleanHtmlContent(content),
                                    monthIntro: monthIntro || undefined,
                                    monthTheme: monthTheme || undefined
                                });
                                return;
                            }
                        }
                    }
                }

                // Fallback: use chapter index approach
                const config = getBookConfig(bookId);
                const chapterIndex = config.startChapter + dayOfYear - 1;

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
    return linkCount > 10 || (lower.includes('contents') && linkCount > 3);
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
        if (tag.toLowerCase() === 'span' || tag.toLowerCase() === 'div') {
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

    // Remove date headers (e.g., "January 1", "February 15") - they're already shown in the modal header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    for (const month of monthNames) {
        // Remove as h1/h2/h3 heading
        clean = clean.replace(new RegExp(`<h[1-3]>\\s*${month}\\s+\\d{1,2}(st|nd|rd|th)?\\s*</h[1-3]>`, 'gi'), '');
        // Remove as paragraph
        clean = clean.replace(new RegExp(`<p>\\s*${month}\\s+\\d{1,2}(st|nd|rd|th)?\\s*</p>`, 'gi'), '');
    }

    // Format author attributions with proper spacing (wrap em-dashes with proper styling)
    // Transform "—Author Name" into styled attribution
    clean = clean.replace(/<p>\s*—([^<]+)<\/p>/g, '<p class="author-attribution">—$1</p>');
    clean = clean.replace(/<p>—/g, '<p class="author-attribution">—');

    return clean;
}

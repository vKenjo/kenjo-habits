// Daily reading books data and utilities

export interface DailyBook {
    id: string;
    title: string;
    shortTitle: string;
    author: string;
    icon: string;
    color: string;
    epubFile: string;
}

export const dailyBooks: DailyBook[] = [
    {
        id: 'daily-stoic',
        title: 'The Daily Stoic',
        shortTitle: 'Daily Stoic',
        author: 'Ryan Holiday',
        icon: '🏛️',
        color: 'from-slate-100 to-stone-100',
        epubFile: '_OceanofPDF.com_The_Daily_Stoic_-_Ryan_Holiday.epub'
    },
    {
        id: 'daily-laws',
        title: 'The Daily Laws',
        shortTitle: 'Daily Laws',
        author: 'Robert Greene',
        icon: '⚔️',
        color: 'from-red-50 to-orange-50',
        epubFile: '_OceanofPDF.com_The_Daily_Laws_366_Meditations_on_Power_Seduction_Mastery_Strategy_and_Human_Nature_-_Robert_Greene.epub'
    },
    {
        id: 'daily-drucker',
        title: 'The Daily Drucker',
        shortTitle: 'Daily Drucker',
        author: 'Peter F. Drucker',
        icon: '📊',
        color: 'from-blue-50 to-indigo-50',
        epubFile: '_OceanofPDF.com_The_Daily_Drucker_-_Peter_F_Drucker.epub'
    },
    {
        id: 'calendar-of-wisdom',
        title: 'A Calendar of Wisdom',
        shortTitle: 'Calendar of Wisdom',
        author: 'Leo Tolstoy',
        icon: '📜',
        color: 'from-amber-50 to-yellow-50',
        epubFile: '_OceanofPDF.com_A_Calendar_of_Wisdom_Daily_Thoughts_to_Nourish_the_Soul_Written_and_Selected_from_the_Worlds_Sacred_Texts_-_Leo_Tolstoy.epub'
    }
];

// Constants for day of year validation
export const MIN_DAY_OF_YEAR = 1;
export const MAX_DAY_OF_YEAR = 366; // Accounts for leap years

/**
 * Get the day of year (1-366) using local timezone
 * This ensures consistent behavior across client and server
 */
export function getDayOfYear(date: Date = new Date()): number {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Create a date at start of year using local timezone
    const startOfYear = new Date(year, 0, 1);
    // Create current date using local timezone components
    const currentDate = new Date(year, month, day);

    const diff = currentDate.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay) + 1; // +1 because Jan 1 = day 1, not day 0
}

/**
 * Check if a day of year is valid for the given year
 */
export function isValidDayOfYear(dayOfYear: number, year: number = new Date().getFullYear()): boolean {
    if (dayOfYear < MIN_DAY_OF_YEAR) return false;

    // Check for leap year
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const maxDay = isLeapYear ? 366 : 365;

    return dayOfYear <= maxDay;
}

/**
 * Get a consistent local date string (YYYY-MM-DD) from day of year
 */
export function getLocalDateString(dayOfYear: number, year: number = new Date().getFullYear()): string {
    const date = new Date(year, 0, dayOfYear);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function formatDateForReading(date: Date = new Date()): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}

export function getBookById(id: string): DailyBook | undefined {
    return dailyBooks.find(book => book.id === id);
}

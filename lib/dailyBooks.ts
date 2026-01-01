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

export function getDayOfYear(date: Date = new Date()): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
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

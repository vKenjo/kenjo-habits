const EPubLib = require('epub2');
const EPub = EPubLib.EPub || EPubLib;
const path = require('path');

async function inspectEpub(filename) {
    const epubPath = path.join(process.cwd(), 'books', filename);
    const epub = new EPub(epubPath);

    epub.on('error', (err) => console.error(err));

    epub.on('end', async () => {
        const chapterId = 'id121'; // Chapter 6

        epub.getChapter(chapterId, (err, text) => {
            if (err) {
                console.error(err);
                return;
            }

            console.log('\n--- Start of Chapter 6 ---');
            console.log(text.substring(0, 3000));

            console.log('\n--- Around "January 2" match ---');
            const idx = text.indexOf('January 2');
            console.log(text.substring(idx - 1000, idx + 1000));
        });
    });

    epub.parse();
}

const filename = '_OceanofPDF.com_A_Calendar_of_Wisdom_Daily_Thoughts_to_Nourish_the_Soul_Written_and_Selected_from_the_Worlds_Sacred_Texts_-_Leo_Tolstoy.epub';
inspectEpub(filename);

// Curated maxims from Francois Duc De La Rochefoucauld
// Source: https://www.gutenberg.org/files/9105/9105-h/9105-h.htm

export const maxims = [
    "We have all sufficient strength to support the misfortunes of others.",
    "The constancy of the wise is only the talent of concealing the agitation of their hearts.",
    "Philosophy triumphs easily over past evils and future evils; but present evils triumph over it.",
    "We need greater virtues to sustain good than evil fortune.",
    "Neither the sun nor death can be looked at without winking.",
    "The evil that we do does not attract to us so much persecution and hatred as our good qualities.",
    "We have more strength than will; and it is often merely for an excuse we say things are impossible.",
    "If we had no faults we should not take so much pleasure in noting those of others.",
    "If we had no pride we should not complain of that of others.",
    "We promise according to our hopes; we perform according to our fears.",
    "Interest speaks all sorts of tongues and plays all sorts of characters; even that of disinterestedness.",
    "Those who apply themselves too closely to little things often become incapable of great things.",
    "We have not enough strength to follow all our reason.",
    "A man often believes himself leader when he is led.",
    "The caprice of our temper is even more whimsical than that of Fortune.",
    "Our temper sets a price upon every gift that we receive from fortune.",
    "Happiness is in the taste, and not in the things themselves.",
    "We are never so happy or so unhappy as we suppose.",
    "Nothing should so much diminish the satisfaction which we feel with ourselves as seeing that we disapprove at one time of that which we approve of at another.",
    "Whatever great advantages nature may give, it is not she alone, but fortune also that makes the hero.",
    "To establish ourselves in the world we do everything to appear as if we were established.",
    "Although men flatter themselves with their great actions, they are not so often the result of a great design as of chance.",
    "Fortune turns all things to the advantage of those on whom she smiles.",
    "The happiness or unhappiness of men depends no less upon their dispositions than their fortunes.",
    "Sincerity is an openness of heart; we find it in very few people.",
    "Truth does not do as much good in the world as its counterfeits do evil.",
    "What grace is to the body good sense is to the mind.",
    "There is no disguise which can long hide love where it exists, nor feign it where it does not.",
    "There is only one sort of love, but there are a thousand different copies.",
    "The love of justice is simply in the majority of men the fear of suffering injustice.",
    "Silence is the best resolve for him who distrusts himself.",
    "What renders us so changeable in our friendship is that it is difficult to know the qualities of the soul, but easy to know those of the mind.",
    "Reconciliation with our enemies is but a desire to better our condition, a weariness of war, the fear of some unlucky accident.",
    "Pride indemnifies itself and loses nothing even when it casts away vanity.",
    "Pride is much the same in all men; the only difference is the method and manner of showing it.",
    "Interest blinds some and makes some see.",
    "Strength and weakness of mind are mis-named; they are really only the good or happy arrangement of our bodily organs.",
    "The attachment or indifference which philosophers have shown to life is only the style of their self love.",
    "Whatever difference there appears in our fortunes, there is nevertheless a certain compensation of good and evil which renders them equal.",
    "There are no accidents so unfortunate from which skilful men will not draw some advantage.",
    "Moderation is caused by the fear of exciting the envy and contempt which those merit who are intoxicated with their good fortune.",
];

export function getRandomMaxim(): string {
    const randomIndex = Math.floor(Math.random() * maxims.length);
    return maxims[randomIndex];
}

export function getDailyMaxim(dateString: string): string {
    // Use the date string to get a consistent maxim for the day
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const index = Math.abs(hash) % maxims.length;
    return maxims[index];
}

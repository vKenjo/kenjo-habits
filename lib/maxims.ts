// Curated maxims from Francois Duc De La Rochefoucauld
// Source: https://www.gutenberg.org/files/9105/9105-h/9105-h.htm

export interface Maxim {
    number: number;
    text: string;
}

export const maxims: Maxim[] = [
    { number: 19, text: "We have all sufficient strength to support the misfortunes of others." },
    { number: 20, text: "The constancy of the wise is only the talent of concealing the agitation of their hearts." },
    { number: 22, text: "Philosophy triumphs easily over past evils and future evils; but present evils triumph over it." },
    { number: 25, text: "We need greater virtues to sustain good than evil fortune." },
    { number: 26, text: "Neither the sun nor death can be looked at without winking." },
    { number: 29, text: "The evil that we do does not attract to us so much persecution and hatred as our good qualities." },
    { number: 30, text: "We have more strength than will; and it is often merely for an excuse we say things are impossible." },
    { number: 31, text: "If we had no faults we should not take so much pleasure in noting those of others." },
    { number: 34, text: "If we had no pride we should not complain of that of others." },
    { number: 38, text: "We promise according to our hopes; we perform according to our fears." },
    { number: 39, text: "Interest speaks all sorts of tongues and plays all sorts of characters; even that of disinterestedness." },
    { number: 41, text: "Those who apply themselves too closely to little things often become incapable of great things." },
    { number: 42, text: "We have not enough strength to follow all our reason." },
    { number: 43, text: "A man often believes himself leader when he is led." },
    { number: 45, text: "The caprice of our temper is even more whimsical than that of Fortune." },
    { number: 47, text: "Our temper sets a price upon every gift that we receive from fortune." },
    { number: 48, text: "Happiness is in the taste, and not in the things themselves." },
    { number: 49, text: "We are never so happy or so unhappy as we suppose." },
    { number: 51, text: "Nothing should so much diminish the satisfaction which we feel with ourselves as seeing that we disapprove at one time of that which we approve of at another." },
    { number: 53, text: "Whatever great advantages nature may give, it is not she alone, but fortune also that makes the hero." },
    { number: 56, text: "To establish ourselves in the world we do everything to appear as if we were established." },
    { number: 57, text: "Although men flatter themselves with their great actions, they are not so often the result of a great design as of chance." },
    { number: 60, text: "Fortune turns all things to the advantage of those on whom she smiles." },
    { number: 61, text: "The happiness or unhappiness of men depends no less upon their dispositions than their fortunes." },
    { number: 62, text: "Sincerity is an openness of heart; we find it in very few people." },
    { number: 64, text: "Truth does not do as much good in the world as its counterfeits do evil." },
    { number: 67, text: "What grace is to the body good sense is to the mind." },
    { number: 70, text: "There is no disguise which can long hide love where it exists, nor feign it where it does not." },
    { number: 74, text: "There is only one sort of love, but there are a thousand different copies." },
    { number: 78, text: "The love of justice is simply in the majority of men the fear of suffering injustice." },
    { number: 79, text: "Silence is the best resolve for him who distrusts himself." },
    { number: 80, text: "What renders us so changeable in our friendship is that it is difficult to know the qualities of the soul, but easy to know those of the mind." },
    { number: 82, text: "Reconciliation with our enemies is but a desire to better our condition, a weariness of war, the fear of some unlucky accident." },
    { number: 33, text: "Pride indemnifies itself and loses nothing even when it casts away vanity." },
    { number: 35, text: "Pride is much the same in all men; the only difference is the method and manner of showing it." },
    { number: 40, text: "Interest blinds some and makes some see." },
    { number: 44, text: "Strength and weakness of mind are mis-named; they are really only the good or happy arrangement of our bodily organs." },
    { number: 46, text: "The attachment or indifference which philosophers have shown to life is only the style of their self love." },
    { number: 52, text: "Whatever difference there appears in our fortunes, there is nevertheless a certain compensation of good and evil which renders them equal." },
    { number: 59, text: "There are no accidents so unfortunate from which skilful men will not draw some advantage." },
    { number: 18, text: "Moderation is caused by the fear of exciting the envy and contempt which those merit who are intoxicated with their good fortune." },
];

export function getRandomMaxim(): Maxim {
    const randomIndex = Math.floor(Math.random() * maxims.length);
    return maxims[randomIndex];
}

export function getMaximByIndex(index: number): Maxim {
    return maxims[index % maxims.length];
}

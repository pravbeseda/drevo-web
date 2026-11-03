import { toProseLines } from './prose-lines';

describe('toProseLines', () => {
    it('should keep one entry per source line', () => {
        expect(toProseLines('Первая строка.\n\nТретья строка.')).toEqual(['Первая строка.', '', 'Третья строка.']);
    });

    it('should keep the text of headings, bold and italic', () => {
        expect(toProseLines('== Раздел ==\n=== Подраздел ===\nОн *очень* _важен_.')).toEqual([
            'Раздел',
            'Подраздел',
            'Он очень важен.',
        ]);
    });

    it('should keep the label of a link, or its target when it has none', () => {
        expect(toProseLines('См. ((Москва)) и ((Санкт-Петербург=столицу)).')).toEqual(['См. Москва и столицу.']);
    });

    it('should keep the label of a link inside bold', () => {
        expect(toProseLines('*((Храм=храма))* стоит.')).toEqual(['храма стоит.']);
    });

    it('should turn a footnote into a parenthesis', () => {
        expect(toProseLines('Текст[[Источник: летопись]] дальше.')).toEqual(['Текст (Источник: летопись) дальше.']);
    });

    it('should keep the lines of a footnote spanning lines', () => {
        expect(toProseLines('Начало[[первая\nвторая]] конец.')).toEqual(['Начало (первая', 'вторая) конец.']);
    });

    it('should drop comments, nowiki and inline code', () => {
        expect(toProseLines('Текст [*заметка*] и `код`, <nowiki>*сырое*</nowiki> тут.')).toEqual(['Текст и , тут.']);
    });

    it('should keep URLs, so the punctuation around them reads as written', () => {
        expect(toProseLines('Сайт (опубликовано 30.05.2012), https://pravicon.com/info-692.')).toEqual([
            'Сайт (опубликовано 30.05.2012), https://pravicon.com/info-692.',
        ]);
    });

    it('should leave the underscores and asterisks of a URL alone', () => {
        expect(
            toProseLines('См. https://ru.wikipedia.org/wiki/Сергий_Радонежский_(x) и http://a.ru/*b*/c тут.'),
        ).toEqual(['См. https://ru.wikipedia.org/wiki/Сергий_Радонежский_(x) и http://a.ru/*b*/c тут.']);
    });

    it('should end a URL where a comment glued to it starts', () => {
        expect(toProseLines('См. https://a.ru/x[*битая*] тут.')).toEqual(['См. https://a.ru/x тут.']);
    });

    it('should still strip the markup next to a URL', () => {
        expect(toProseLines('_См._ https://drevo-info.ru/x_y_z и *тут*.')).toEqual([
            'См. https://drevo-info.ru/x_y_z и тут.',
        ]);
    });

    it('should drop the body of a comment spanning lines', () => {
        expect(toProseLines('До [*начало\nсередина\nконец*] после.')).toEqual(['До', '', 'после.']);
    });

    it('should drop the body of a nowiki block spanning lines', () => {
        expect(toProseLines('<nowiki>сырой\nтекст</nowiki>\nПроза.')).toEqual(['', '', 'Проза.']);
    });

    it('should drop pictures and categories', () => {
        expect(toProseLines('@123@ Храм @-45@ стоит.{{Храмы}}')).toEqual(['Храм стоит.']);
    });

    it('should drop list, quote and indent markers', () => {
        expect(toProseLines('* Пункт\n## Подпункт\n> Цитата\n:: Отступ')).toEqual([
            'Пункт',
            'Подпункт',
            'Цитата',
            'Отступ',
        ]);
    });

    it('should leave a line with no letters empty', () => {
        expect(toProseLines('@123@\n----\n1914 — 1918')).toEqual(['', '', '']);
    });
});

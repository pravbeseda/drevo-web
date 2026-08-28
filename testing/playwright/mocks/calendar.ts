import { CalendarDayDto, CalendarMonthDto, CalendarWeekDto, CalendarYearDto } from '@drevo-web/shared';

const MONTH_NAMES = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
];

function createCalendarDayDto(overrides: Partial<CalendarDayDto> = {}): CalendarDayDto {
    return {
        dayOfMonth: 1,
        articleTitle: '19 ДЕКАБРЯ',
        articleId: 1122,
        fast: false,
        feast: null,
        ...overrides,
    };
}

/**
 * One month whose first week is padded and whose days differ enough to tell the
 * cell states apart: a fast day, a twelve-feast, and a day with no article.
 */
function createCalendarMonthDto(number: number): CalendarMonthDto {
    const week: CalendarWeekDto = [
        null,
        null,
        createCalendarDayDto({ dayOfMonth: 1 }),
        createCalendarDayDto({ dayOfMonth: 2, fast: true }),
        createCalendarDayDto({ dayOfMonth: 3, feast: 'twelve', articleId: 2566, articleTitle: '25 ДЕКАБРЯ' }),
        createCalendarDayDto({ dayOfMonth: 4, articleId: null, articleTitle: '22 ДЕКАБРЯ' }),
        createCalendarDayDto({ dayOfMonth: 5 }),
    ];

    return { number, name: MONTH_NAMES[number - 1], weeks: [week] };
}

export function createCalendarYearDto(overrides: Partial<CalendarYearDto> = {}): CalendarYearDto {
    return {
        year: 2026,
        prev: 2025,
        next: 2027,
        months: Array.from({ length: 12 }, (_unused, index) => createCalendarMonthDto(index + 1)),
        legend: '<h2>Церковные праздники в 2026 году</h2><p>Пасха — 12 апреля</p>',
        disclaimer: '<p><b>Внимание!</b> Этот церковный календарь может содержать неточности.</p>',
        ...overrides,
    };
}

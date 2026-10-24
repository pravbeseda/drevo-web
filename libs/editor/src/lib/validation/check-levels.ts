import { CheckCategory, CheckLevel } from './models/check-finding.model';

export const CHECK_LEVELS: Readonly<Record<CheckCategory, CheckLevel>> = {
    markup: 'serious',
    spelling: 'serious',
    style: 'fix',
    lexicon: 'hint',
};

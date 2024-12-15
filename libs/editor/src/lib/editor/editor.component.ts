import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { EditorState } from '@codemirror/state';
import { EditorView } from 'codemirror';
import { drawSelection, dropCursor, highlightSpecialChars, keymap } from '@codemirror/view';
import {
    defaultHighlightStyle,
    indentOnInput,
    bracketMatching,
    syntaxHighlighting,
} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { wikiHighlighter, wikiTheme } from '../wiki-highlighter/wiki-highlighter';

const example = `@20537@ *Валерий [[арз]] Николаевич [[два]] Духанин* (род. ((1976))), ((священник)), публицист, духовный писатель

Родился ((15 мая=28 мая)) ((1976)) года в ((Оренбург=Оренбурге)) в семье служащих.

Крестился в августе ((1989)) года, с этого времени стал посещать храм.

В ((1992)) году был принят чтецом и алтарником в ((Оренбургский Покровский храм=храм Покрова Божией Матери в Оренбурге)).

Закончил среднюю школу в ((1993)) году и в том же году поступил в ((Московская духовная семинария=Московскую духовную семинарию)), во время обучения нёс послушание в семинарском храме. В ((1996)) году поступил в ((Московская духовная академия=Московскую духовную академию)), во время учебы исполнял миссионерское послушание: проводил духовные беседы с заключенными следственного изолятора в Сергиевом Посаде, занимался организацией гуманитарной помощи заключенным, преподавал на богословских курсах в Покровском женском монастыре города Хотьково, а также с конца III курса стал помощником проректора МДА по воспитательной работе. В июне ((2000)) года окончил МДА, защитив диссертацию «Святоотеческая традиция умного делания в духовном опыте Святителя ((Игнатий (Брянчанинов)=Игнатия, епископа Кавказского))».

С августа ((2000)) до ((2002)) года - помощник проректора Московской духовной семинарии по воспитательной работе. Являлся также сотрудником Миссионерского отдела при Академии, преподавал на богословских курсах при храме святых апостолов Петра и Павла Сергиева Посада и в Покровском женском монастыре города Хотьково.

В ((2003)) году перешёл в ((Николо-Угрешская духовная семинария=Николо-Угрешскую духовную семинарию)), где занимает должность проректора по учебной работе, а также преподавал патрологию, апологетику и византологию.

В ((2011)) - ((2012)) годах - ведущий авторских телепередач на ТК «Радость моя». В ((2012)) - ((2013)) годах на том же телеканале как эксперт участвовал в молодёжном дискуссионном клубе «СО-ВЫ».

2 марта ((2014)) года рукоположен в сан ((диакон=диакона)) архиепископом Верейским ((Евгений (Решетников)=Евгением (Решетниковым))) в Покровском академическом храме МДА [["Служение ректора: Неделя сыропустная. Воспоминание Адамова изгнания" - https://old.mpda.ru/photo/text/2162215.html]]. 8 октября ((2014)) года рукоположен в сан ((священник=священника)) патриархом Московским и всея Руси ((Кирилл (Гундяев)=Кириллом)) в Успенском соборе Свято-Троицкой Сергиевой лавры [["В день преставления преподобного Сергия Радонежского Предстоятель Русской Церкви возглавил торжества в Троице-Сергиевой лавре" - http://www.patriarchia.ru/db/text/3783206.html]].

19 сентября 2024 года награждён орденом святителя Макария, митрополита Московского III степени "в связи с трудами на ниве духовного образования и в связи с 25-летием основания семинарии".[[Клирик семинарского храма иерей Валерий Духанин отмечен наградой // nupds.ru, 19 сентября 2024, https:///klirik-seminarskogo-hrama-ierej-valerij-duhanin-otmechen-nagradoj-3358]]

Автор многих книг, публикаций и докладов о смысле и значении православной веры. Редактор программ на радио «Радонеж».

== Сочинения ==

* Святоотеческая традиция умного делания в духовном опыте Святителя Игнатия, епископа Кавказского (диссертация на соискание ученой степени кандидата богословия). – Сергиев Посад, 2000. С. 170.
* Христос или кинозвезда? Что скрывается за фильмом Мела Гибсона «Страсти Христовы». М.: Русский Хронограф, 2004. С. 16.
* Сокровенный дар. Восхождение к Богу по учению святителя Игнатия (Брянчанинова). М.: Русский Хронограф, 2004. С. 400.
* Православие и мир кино. М.: «Драккар», 2005. С. 190.
* Сокровенный мир Православия: современный человек на пути к Богу. М.: Издат. Совет РПЦ, 2006. С. 536.
* Путь исцеления души: Таинство покаяния. М.: Издат. Совет РПЦ, 2006. С. 96.
* Чудо Венчания, или Таинство Божественной Любви. М.: Издат. Совет РПЦ, 2006. С. 128.
* Дар исцеления: Таинство Соборования. М.: Издат. Совет РПЦ, 2007. С. 96.
* Во что мы веруем? 100 ответов современнику. М.: Издат. Совет РПЦ, 2008. С. 256.
* Дары Святого Причащения: что нужно знать о таинстве Евхаристии. М.: Изд-во Московской Патриархии, 2010. С. 144.
* Что такое порча и может ли она приставать к христианину. М.: Изд-во Московской Патриархии, 2011. С. 96.
* Огради нас, Господи, от суеверий, оккультизма, порчи. М.: Изд-во Московской Патриархии, 2011. С. 350.
* Сокровенный дар. По духовному наследию святителя Игнатия (Брянчанинова). М.: Сибирская благозвонница, 2013. С. 410..
* Возлюби ближнего твоего: Тайны общения. М.: Изд-во Московской Патриархии, 2014. С. 240.
* Жизнь святителя Игнатия (Брянчанинова). М.: Сибирская благозвонница, 2014. С. 78.
* Новые чудеса преподобного Сергия. М.: Изд-во Московской Патриархии, 2014. С. 112.
* Во что мы веруем? Вопросы и ответы. М.: Изд-во Сретенского монастыря, 2015. С. 320.
* Таинство Брака. М.: Изд-во Сретенского монастыря, 2016. С. 208.
* Таинство Елеосвящения. М.: Изд-во Сретенского монастыря, 2016. С. 144.
* Таинство Крещения. М.: Изд-во Сретенского монастыря, 2016. С. 128.
* Бояться ли порчи и сглаза / Серия «Азбука богословия», Выпуск 1. М.: Русский печатный дом, 2016. С. 16.
* Вера и суеверие / Серия «Азбука богословия», Выпуск 2. М.: Русский печатный дом, 2016. С. 16.
* Зачем исповедоваться и причащаться / Серия «Азбука богословия», Выпуск 3. М.: Русский печатный дом, 2016. С. 16.
* Чудо от Бога. Что такое чудо и бывают ли чудеса в наши дни / Серия «Азбука богословия», Выпуск 5. М.: Русский печатный дом, 2016. С. 16.
* Таинство Причащения. М.: Изд-во Сретенского монастыря, 2016. С. 176.
* Как научиться правильной молитве. По творениям святителя Игнатия (Брянчанинова). М.: Ника, 2016. С. 44.
* Оккультизм, суеверия, порча: искушение и преодоление. М.: Изд-во Московской Патриархии, 2017. С. 352.
* Новые чудеса преподобного Сергия. М.: Изд-во Московской Патриархии, 2017. С. 128.
* Сокровенный мир Православия: современный человек на пути к Богу. Изд-е 7-е, испр. и доп. М.: «Воскресение», 2018. С. 560.
* Покаяние как исцеление: о таинстве Исповеди. М.: Изд-во Московской Патриархии, 2018. С. 160.
* Покаяние и плач о грехах. М.: Изд-во Ника, 2017. С. 48.
* Кто мы? Кто наш ближний? М.: Фонд социокультурных проектов «Традиция», 2019. С. 384.
* Вера и магия. М.: Фонд социокультурных проектов «Традиция», 2020. С. 460.
* Довериться Богу. М.:Воскресение, 2020. С. 256

==Использованные материалы==
* "Валерий Николаевич Духанин" // Сайт "Русское богословие"
** http://russian-theology.ru/cds/ecumenical-councils-2-3/extra-materials/authors/duhanin.html
* Биография и список публикаций на официальном сайте священника Валерия Духанина
** http://duhanin.cerkov.ru/duxovenstvo/`;

@Component({
    selector: 'lib-editor',
    imports: [CommonModule],
    templateUrl: './editor.component.html',
    styleUrl: './editor.component.scss',
})
export class EditorComponent implements AfterViewInit {
    @ViewChild('editorContainer')
    editorContainer?: ElementRef;

    constructor(private host: ElementRef, @Inject(PLATFORM_ID) private platformId: object) {}

    ngAfterViewInit(): void {
        if (isPlatformServer(this.platformId)) {
            return;
        }

        if (!this.editorContainer) {
            return;
        }

        const editor = new EditorView({
            state: EditorState.create({
                doc: example,
                extensions: [
                    highlightSpecialChars(),
                    drawSelection(),
                    dropCursor(),
                    syntaxHighlighting(defaultHighlightStyle),
                    indentOnInput(),
                    EditorView.lineWrapping,
                    history(),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
                    closeBrackets(),
                    bracketMatching(),
                    wikiHighlighter,
                    wikiTheme,
                ],
            }),
            parent: this.editorContainer.nativeElement,
        });

        editor.contentDOM.setAttribute('spellcheck', 'true');
        editor.contentDOM.setAttribute('autocorrect', 'on');
    }
}

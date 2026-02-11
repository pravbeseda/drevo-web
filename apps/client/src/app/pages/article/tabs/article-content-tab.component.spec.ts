import { ArticlePageService } from '../article-page.service';
import { ArticleContentTabComponent } from './article-content-tab.component';
import { ActivatedRoute } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ArticleVersion } from '@drevo-web/shared';
import { BehaviorSubject, of } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 123,
    versionId: 456,
    title: 'Test Article',
    content: '<p>Test content</p>',
    author: 'Author',
    date: new Date('2024-01-15'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

describe('ArticleContentTabComponent', () => {
    let spectator: Spectator<ArticleContentTabComponent>;

    const createComponent = createComponentFactory({
        component: ArticleContentTabComponent,
        providers: [
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: {
                    article: signal(mockArticle),
                    editUrl: signal(undefined),
                },
            },
            {
                provide: ActivatedRoute,
                useValue: { fragment: of(undefined) },
            },
        ],
    });

    it('should create', () => {
        spectator = createComponent();
        expect(spectator.component).toBeTruthy();
    });

    it('should render article-content component', () => {
        spectator = createComponent();
        expect(spectator.query('app-article-content')).toBeTruthy();
    });

    it('should not render content when article is undefined', () => {
        spectator = createComponent({
            providers: [
                mockLoggerProvider(),
                {
                    provide: ArticlePageService,
                    useValue: { article: signal(undefined), editUrl: signal(undefined) },
                },
                {
                    provide: ActivatedRoute,
                    useValue: { fragment: of(undefined) },
                },
            ],
        });
        expect(spectator.query('app-article-content')).toBeFalsy();
    });
});

function mockRect(
    overrides: Partial<DOMRect> = {}
): ReturnType<Element['getBoundingClientRect']> {
    return {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...overrides,
    };
}

describe('ArticleContentTabComponent fragment scrolling', () => {
    let spectator: Spectator<ArticleContentTabComponent>;
    let mainContainer: HTMLElement;
    let scrollToMock: jest.Mock;
    let fragmentSubject: BehaviorSubject<string | undefined>;

    const createComponent = createComponentFactory({
        component: ArticleContentTabComponent,
        providers: [
            mockLoggerProvider(),
            {
                provide: ArticlePageService,
                useValue: { article: signal(mockArticle), editUrl: signal(undefined) },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        fragmentSubject = new BehaviorSubject<string | undefined>(undefined);
        mainContainer = document.createElement('div');
        mainContainer.id = 'content';
        mainContainer.style.overflowY = 'auto';
        mainContainer.style.height = '500px';
        scrollToMock = jest.fn();
        mainContainer.scrollTo = scrollToMock;
        document.body.appendChild(mainContainer);
    });

    afterEach(() => {
        if (document.body.contains(mainContainer)) {
            document.body.removeChild(mainContainer);
        }
    });

    it('should scroll main container to element when fragment is provided', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: fragmentSubject.asObservable(),
                    },
                },
            ],
        });

        const mockElement = document.createElement('div');
        mockElement.id = 'S26';
        mainContainer.appendChild(mockElement);

        jest.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue(
            mockRect({ top: 300 })
        );
        jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue(
            mockRect({ top: 100 })
        );
        Object.defineProperty(mainContainer, 'scrollTop', {
            value: 0,
            writable: true,
            configurable: true,
        });

        fragmentSubject.next('S26');
        spectator.detectChanges();

        expect(scrollToMock).toHaveBeenCalledWith({
            top: 200,
            behavior: 'smooth',
        });
    });

    it('should not scroll when no fragment is provided', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: fragmentSubject.asObservable(),
                    },
                },
            ],
        });

        fragmentSubject.next(undefined);
        spectator.detectChanges();

        expect(scrollToMock).not.toHaveBeenCalled();
    });

    it('should handle non-existent fragment gracefully', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: fragmentSubject.asObservable(),
                    },
                },
            ],
        });

        fragmentSubject.next('nonexistent');
        spectator.detectChanges();

        expect(scrollToMock).not.toHaveBeenCalled();
    });

    it('should scroll to element with name attribute when id not found', () => {
        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: fragmentSubject.asObservable(),
                    },
                },
            ],
        });

        const mockAnchor = document.createElement('a');
        mockAnchor.setAttribute('name', 'S26');
        mainContainer.appendChild(mockAnchor);

        jest.spyOn(mockAnchor, 'getBoundingClientRect').mockReturnValue(
            mockRect({ top: 300 })
        );
        jest.spyOn(mainContainer, 'getBoundingClientRect').mockReturnValue(
            mockRect({ top: 100 })
        );
        Object.defineProperty(mainContainer, 'scrollTop', {
            value: 0,
            writable: true,
            configurable: true,
        });

        fragmentSubject.next('S26');
        spectator.detectChanges();

        expect(scrollToMock).toHaveBeenCalledWith({
            top: 200,
            behavior: 'smooth',
        });
    });

    it('should fallback to scrollIntoView if main container is not found', () => {
        document.body.removeChild(mainContainer);

        spectator = createComponent({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: fragmentSubject.asObservable(),
                    },
                },
            ],
        });

        const mockElement = document.createElement('div');
        mockElement.id = 'S26';
        const scrollIntoViewMock = jest.fn();
        mockElement.scrollIntoView = scrollIntoViewMock;
        document.body.appendChild(mockElement);

        fragmentSubject.next('S26');
        spectator.detectChanges();

        expect(scrollIntoViewMock).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'start',
        });

        document.body.removeChild(mockElement);
    });
});

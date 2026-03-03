import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { DiffViewComponent } from './diff-view.component';

describe('DiffViewComponent', () => {
    let spectator: Spectator<DiffViewComponent>;

    const createComponent = createComponentFactory({
        component: DiffViewComponent,
        providers: [mockLoggerProvider()],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                oldText: 'old content',
                newText: 'new content',
            },
        });
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('collapsed mode', () => {
        it('should start with collapsed = true', () => {
            expect(spectator.component.collapsed()).toBe(true);
        });

        it('should toggle collapsed state on each call', () => {
            spectator.component.toggleCollapsed();
            expect(spectator.component.collapsed()).toBe(false);

            spectator.component.toggleCollapsed();
            expect(spectator.component.collapsed()).toBe(true);
        });

        describe('expanded rendering', () => {
            beforeEach(() => {
                spectator.component.toggleCollapsed();
            });

            it('should not collapse anything in expanded mode', () => {
                spectator.setInput({
                    oldText: 'old\nunchanged1\nunchanged2\n',
                    newText: 'new\nunchanged1\nunchanged2\n',
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });
        });

        describe('collapsed rendering', () => {
            it('should collapse group of 2+ consecutive unchanged lines', () => {
                spectator.setInput({
                    oldText: 'old\nunchanged1\nunchanged2\n',
                    newText: 'new\nunchanged1\nunchanged2\n',
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 2');
            });

            it('should show the correct count in the collapsed block', () => {
                spectator.setInput({
                    oldText: 'old\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                    newText: 'new\nunchanged1\nunchanged2\nunchanged3\nunchanged4\n',
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).toContain('Строк без изменений: 4');
            });

            it('should NOT collapse a single unchanged line', () => {
                spectator.setInput({
                    oldText: 'old1\nunchanged\nold2\n',
                    newText: 'new1\nunchanged\nnew2\n',
                });
                spectator.detectChanges();

                expect(spectator.component.diffHtml()).not.toContain('diff-collapsed-lines');
            });

            it('should show changed lines with insert and delete spans', () => {
                spectator.setInput({
                    oldText: 'old\nunchanged1\nunchanged2\n',
                    newText: 'new\nunchanged1\nunchanged2\n',
                });
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).toContain('diff-delete');
                expect(html).toContain('diff-insert');
            });

            it('should not create highlighted spans for whitespace-only changes', () => {
                spectator.setInput({
                    oldText: 'text\n   \n',
                    newText: 'text\n\t\n',
                });
                spectator.detectChanges();

                const html = spectator.component.diffHtml();
                expect(html).not.toMatch(/<span class="diff-(insert|delete)">\s*<\/span>/);
            });
        });
    });
});

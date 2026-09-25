import { createDirectiveFactory, SpectatorDirective } from '@ngneat/spectator/jest';
import { InViewDirective } from './in-view.directive';

class FakeIntersectionObserver {
    static readonly instances: FakeIntersectionObserver[] = [];

    readonly observed: Element[] = [];
    disconnected = false;

    constructor(private readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.instances.push(this);
    }

    observe(element: Element): void {
        this.observed.push(element);
    }

    disconnect(): void {
        this.disconnected = true;
    }

    report(isIntersecting: boolean): void {
        this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
}

describe('InViewDirective', () => {
    let spectator: SpectatorDirective<InViewDirective>;
    let seen: number;
    const originalObserver = globalThis.IntersectionObserver;

    const createDirective = createDirectiveFactory({
        directive: InViewDirective,
    });

    beforeEach(() => {
        FakeIntersectionObserver.instances.length = 0;
        globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
        seen = 0;
        spectator = createDirective('<div uiInView></div>');
        spectator.output('uiInView').subscribe(() => seen++);
    });

    afterEach(() => {
        globalThis.IntersectionObserver = originalObserver;
    });

    const observer = (): FakeIntersectionObserver => FakeIntersectionObserver.instances[0];

    it('watches the element it sits on', () => {
        expect(observer().observed).toEqual([spectator.element]);
    });

    it('reports the element coming into view', () => {
        observer().report(true);

        expect(seen).toBe(1);
    });

    it('stays silent while the element is out of view', () => {
        observer().report(false);

        expect(seen).toBe(0);
    });

    it('stops watching once the element is gone', () => {
        spectator.fixture.destroy();

        expect(observer().disconnected).toBe(true);
    });
});

import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { FontScaleService } from '../../services/font-scale/font-scale.service';
import { FontScaleControlComponent } from './font-scale-control.component';

describe('FontScaleControlComponent', () => {
    let spectator: Spectator<FontScaleControlComponent>;
    let fontScaleService: FontScaleService;

    const createComponent = createComponentFactory({
        component: FontScaleControlComponent,
    });

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.style.fontSize = '';
        spectator = createComponent();
        fontScaleService = spectator.inject(FontScaleService);
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.style.fontSize = '';
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should start with popup closed', () => {
        expect(spectator.component.isOpen()).toBe(false);
    });

    it('should toggle popup open and closed', () => {
        spectator.component.toggle();
        expect(spectator.component.isOpen()).toBe(true);

        spectator.component.toggle();
        expect(spectator.component.isOpen()).toBe(false);
    });

    it('should close popup', () => {
        spectator.component.toggle();
        expect(spectator.component.isOpen()).toBe(true);

        spectator.component.close();
        expect(spectator.component.isOpen()).toBe(false);
    });

    it('should display current scale percent', () => {
        expect(spectator.component.scalePercent()).toBe(100);
    });

    it('should increase scale via service', () => {
        spectator.component.increase();
        expect(fontScaleService.scale()).toBe(1.1);
        expect(spectator.component.scalePercent()).toBe(110);
    });

    it('should decrease scale via service', () => {
        spectator.component.increase();
        spectator.component.decrease();
        expect(fontScaleService.scale()).toBe(1);
        expect(spectator.component.scalePercent()).toBe(100);
    });

    it('should reset scale via service', () => {
        spectator.component.increase();
        spectator.component.increase();
        expect(spectator.component.scalePercent()).toBe(120);

        spectator.component.reset();
        expect(fontScaleService.scale()).toBe(1);
        expect(spectator.component.isDefault()).toBe(true);
    });

    it('should report canIncrease from service', () => {
        expect(spectator.component.canIncrease()).toBe(true);

        for (let i = 0; i < 5; i++) {
            spectator.component.increase();
        }
        expect(spectator.component.canIncrease()).toBe(false);
    });

    it('should report canDecrease from service', () => {
        expect(spectator.component.canDecrease()).toBe(true);

        spectator.component.decrease();
        spectator.component.decrease();
        expect(spectator.component.canDecrease()).toBe(false);
    });

    it('should report isDefault from service', () => {
        expect(spectator.component.isDefault()).toBe(true);

        spectator.component.increase();
        expect(spectator.component.isDefault()).toBe(false);
    });
});

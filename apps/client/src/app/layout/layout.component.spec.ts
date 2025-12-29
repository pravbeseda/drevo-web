import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let spectator: Spectator<LayoutComponent>;
  const createComponent = createComponentFactory(LayoutComponent);

  it('should create', () => {
    spectator = createComponent();

    expect(spectator.component).toBeTruthy();
  });
});

import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { SearchComponent } from './search.component';

describe('SearchComponent', () => {
  let spectator: Spectator<SearchComponent>;
  const createComponent = createComponentFactory(SearchComponent);

  it('should create', () => {
    spectator = createComponent();

    expect(spectator.component).toBeTruthy();
  });

  it('should update searchQuery when onSearchChange is called', () => {
    spectator = createComponent();

    expect(spectator.component.searchQuery()).toBe('');

    spectator.component.onSearchChange('test query');

    expect(spectator.component.searchQuery()).toBe('test query');
  });
});

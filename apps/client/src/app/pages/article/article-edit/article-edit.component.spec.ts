import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { ArticleEditComponent } from './article-edit.component';

describe('ArticleEditComponent', () => {
  let spectator: Spectator<ArticleEditComponent>;
  const createComponent = createComponentFactory(ArticleEditComponent);

  it('should create', () => {
    spectator = createComponent();

    expect(spectator.component).toBeTruthy();
  });
});

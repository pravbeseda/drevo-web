import { DiffPageDataService } from '../services/diff-page-data.service';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { map } from 'rxjs';

export const diffTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
    inject(DiffPageDataService)
        .load(route)
        .pipe(map(pairs => pairs?.current.title ?? 'Сравнение версий'));

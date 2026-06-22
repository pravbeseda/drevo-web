import { AuthService } from '../../../services/auth/auth.service';
import { ReviewService } from '../../../services/reviews/review.service';
import { Provider } from '@angular/core';
import { Review, User } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { BehaviorSubject, of } from 'rxjs';

/**
 * Test doubles for the services <app-review-block> injects at construction.
 *
 * Use in specs of components that embed the block so they don't have to know its
 * internal dependencies. Drive rendering via `user$` / `getReviews` when a test
 * cares about the block; otherwise the defaults render an empty (hidden) block.
 */
export interface ReviewBlockStubs {
    readonly user$: BehaviorSubject<User | undefined>;
    readonly getReviews: jest.Mock;
    readonly setReview: jest.Mock;
    readonly deleteReview: jest.Mock;
    readonly confirmOpen: jest.Mock;
    readonly providers: Provider[];
}

/** Build a fresh set of review-block stubs with empty/no-op defaults. */
export function createReviewBlockStubs(): ReviewBlockStubs {
    const user$ = new BehaviorSubject<User | undefined>(undefined);
    const getReviews = jest.fn().mockReturnValue(of<readonly Review[]>([]));
    const setReview = jest.fn().mockReturnValue(of<readonly Review[]>([]));
    const deleteReview = jest.fn().mockReturnValue(of<readonly Review[]>([]));
    const confirmOpen = jest.fn().mockReturnValue(of('cancel'));

    return {
        user$,
        getReviews,
        setReview,
        deleteReview,
        confirmOpen,
        providers: [
            { provide: AuthService, useValue: { user$ } },
            { provide: ReviewService, useValue: { getReviews, setReview, deleteReview } },
            { provide: ConfirmationService, useValue: { open: confirmOpen } },
        ],
    };
}

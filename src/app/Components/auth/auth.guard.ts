import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import * as fromRoot from '../../app.reducer';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store<fromRoot.State>);
  const router = inject(Router);
  const isAuthenticated = store.selectSignal(fromRoot.getIsAuthenticated);
  return isAuthenticated() ? true : router.createUrlTree(["/login"], { queryParams: { returnUrl: state.url } });
};

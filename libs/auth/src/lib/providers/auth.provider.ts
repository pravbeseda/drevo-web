import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';

export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideAppInitializer(() => inject(AuthService).initialize()),
  ]);
}

export function provideAuthWithoutHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(AuthService).initialize()),
  ]);
}

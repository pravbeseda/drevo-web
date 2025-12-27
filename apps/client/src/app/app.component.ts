import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStatusComponent } from './components/auth-status/auth-status.component';

@Component({
    imports: [RouterModule, AuthStatusComponent],
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent {
    title = 'client';
}

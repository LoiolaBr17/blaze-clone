import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { MatExpansionModule } from '@angular/material/expansion';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MatExpansionModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'clone-blaze';
}

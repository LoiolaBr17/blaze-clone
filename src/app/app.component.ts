import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { provideNgxMask, NgxMaskConfig } from 'ngx-mask';

const maskConfig: Partial<NgxMaskConfig> = {
  validation: false,
  thousandSeparator: '.',
  decimalMarker: ',',
  // prefix: 'R$ ',
};
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MatExpansionModule],
  providers: [provideNgxMask(maskConfig)],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'clone-blaze';
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-tabs-description-double',
  imports: [CommonModule, MatTabsModule],
  templateUrl: './tabs-description-double.component.html',
  styleUrl: './tabs-description-double.component.scss',
})
export class TabsDescriptionDoubleComponent {
  activeTabIndex = 0;

  onTabChange(index: number): void {
    console.log(`Aba ativa: ${index}`);
  }
}

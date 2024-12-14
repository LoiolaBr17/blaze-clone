import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TabsDescriptionDoubleComponent } from './components/tabs-description-double/tabs-description-double.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-double',
  templateUrl: './double.component.html',
  styleUrls: ['./double.component.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    TabsDescriptionDoubleComponent,
    FooterComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DoubleComponent implements OnDestroy, OnInit {
  @ViewChild('mySwiper', { static: true }) swiperEl!: ElementRef;
  @ViewChild('progressBar', { static: true }) progressBarEl!: ElementRef;
  @ViewChild('progressText', { static: true }) progressTextEl!: ElementRef;

  isCountingDown: boolean = false;
  quantia: number = 0.0; // Valor numérico formatado
  quantiaInput: string = '0,00'; // Valor exibido no campo como string
  selectedMode: string = 'Normal';
  selectedColor: string = 'red';

  private countdownInterval: any;
  private labels: string[] = [
    ...Array.from({ length: 14 }, (_, i) => `red-${i + 1}`),
    ...Array.from({ length: 14 }, (_, i) => `black-${i + 1}`),
    'white',
  ];

  ngOnInit(): void {
    this.startCarousel();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }

  private startCarousel(): void {
    this.startCountdown(3000, () => {
      this.spinToRandomLabel();
    });
  }

  private spinToRandomLabel(): void {
    const swiper = this.swiperEl.nativeElement.swiper;
    const randomLabel = this.getRandomLabel();
    const targetIndex = this.getIndexByLabel(randomLabel, swiper);

    if (targetIndex === -1) {
      console.error('Label não encontrada no carrossel');
      return;
    }

    swiper.autoplay.stop();

    const totalSlides = swiper.slides.length;
    const currentIndex = swiper.realIndex;
    const fullLoops = totalSlides * 4;

    let steps = fullLoops + (targetIndex - currentIndex);
    if (steps < 0) {
      steps += totalSlides;
    }

    swiper.params.speed = 60;

    const interval = setInterval(() => {
      if (steps > 0) {
        swiper.slideNext(60, true);
        steps--;
      } else {
        clearInterval(interval);
        this.stopCarousel(swiper);
      }
    }, 10);
  }

  private stopCarousel(swiper: any): void {
    this.startCountdown(15000, () => {
      this.spinToRandomLabel();
    });
  }

  private startCountdown(duration: number, callback: () => void): void {
    const progressBar = this.progressBarEl.nativeElement;
    const progressText = this.progressTextEl.nativeElement;
    const start = Date.now();

    this.isCountingDown = true;
    clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = duration - elapsed;
      const percentage = 100 - (elapsed / duration) * 100;
      progressBar.style.transform = `scaleX(${Math.max(0, percentage / 100)})`;

      if (remaining > 0) {
        const seconds = (remaining / 1000).toFixed(2);
        progressText.textContent = `Girando Em ${seconds}`;
      }

      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.isCountingDown = false;
        progressBar.style.width = '100%';
        progressText.textContent = '';
        callback();
      }
    }, 100);
  }

  private getRandomLabel(): string {
    return this.labels[Math.floor(Math.random() * this.labels.length)];
  }

  private getIndexByLabel(label: string, swiper: any): number {
    const slides = swiper.slides;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].querySelector(`.card.${label}`)) {
        return i;
      }
    }
    return -1;
  }

  toggleMode(mode: string): void {
    this.selectedMode = mode;
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }
}

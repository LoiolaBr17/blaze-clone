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
  quantia: number | null = null;

  private countdownInterval: any;

  ngOnInit(): void {
    setTimeout(() => {
      this.randomStop();
    }, 3000);
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
  }

  startCountdown() {
    this.isCountingDown = true;
    const duration = 15000;
    const start = Date.now();
    const progressBar = this.progressBarEl.nativeElement;
    const progressText = this.progressTextEl.nativeElement;

    clearInterval(this.countdownInterval);
    progressBar.style.width = '100%';

    this.countdownInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = duration - elapsed;
      const percentage = 100 - (elapsed / duration) * 100;
      progressBar.style.transform = `scaleX(${Math.max(0, percentage / 100)})`;

      if (remaining > 0) {
        const seconds = (remaining / 1000).toFixed(2);
        progressText.textContent = `Girando Em ${seconds}`;
      }

      if (elapsed >= duration) {
        clearInterval(this.countdownInterval);
        this.randomStop();
      }
    }, 100);
  }

  randomStop() {
    this.isCountingDown = false;
    const swiper = this.swiperEl.nativeElement.swiper;
    const progressText = this.progressTextEl.nativeElement;

    progressText.textContent = 'Girando...';

    const totalSlides = swiper.slides.length;
    const baseCount = totalSlides / 3;

    const chosenIndex = Math.floor(Math.random() * baseCount);
    swiper.autoplay.stop();

    const currentIndex = swiper.realIndex;
    let targetIndex = chosenIndex;

    if (targetIndex < currentIndex) {
      targetIndex += baseCount;
    }

    let steps = targetIndex - currentIndex;
    if (steps <= 0) steps += baseCount;

    //quantidade de voltas extras
    steps += baseCount * 2;

    // Controle de velocidade
    let currentSpeed = 500;
    const maxSpeed = 100;
    const speedIncrement = 100;

    if (currentSpeed > maxSpeed) {
      currentSpeed -= speedIncrement;
      if (currentSpeed < maxSpeed) {
        currentSpeed = maxSpeed;
      }
    } else {
      currentSpeed += speedIncrement;
      if (currentSpeed > maxSpeed) {
        currentSpeed = maxSpeed;
      }
    }

    swiper.params.speed = currentSpeed;
    swiper.update();

    const onTransitionEnd = () => {
      steps--;
      if (steps > 0) {
        currentSpeed += speedIncrement;
        if (currentSpeed > maxSpeed) currentSpeed = maxSpeed;

        swiper.params.speed = currentSpeed;
        swiper.update();
        swiper.slideNext();
      } else {
        // Parou no slide desejado
        swiper.off('transitionEnd', onTransitionEnd);
        swiper.params.speed = 100;
        swiper.update();
        this.startCountdown();
      }
    };

    swiper.on('transitionEnd', onTransitionEnd);
    swiper.slideNext();
  }
}

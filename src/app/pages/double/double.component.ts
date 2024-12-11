import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-double',
  templateUrl: './double.component.html',
  styleUrls: ['./double.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DoubleComponent implements AfterViewInit {
  @ViewChild('mySwiper', { static: true }) swiperEl!: ElementRef;

  ngAfterViewInit(): void {
    // Acessar a instância do swiper se necessário:
    // console.log(this.swiperEl.nativeElement.swiper);
  }

  nextSlide() {
    this.swiperEl.nativeElement.swiper.slideNext();
  }

  prevSlide() {
    this.swiperEl.nativeElement.swiper.slidePrev();
  }
}

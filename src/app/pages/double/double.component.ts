import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-double',
  templateUrl: './double.component.html',
  styleUrls: ['./double.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DoubleComponent implements AfterViewInit {
  @ViewChild('mySwiper', { static: true }) swiperEl!: ElementRef;

  ngAfterViewInit(): void {
    // Se necessário, acessar a instância do swiper:
    // console.log(this.swiperEl.nativeElement.swiper);
  }

  nextSlide() {
    this.swiperEl.nativeElement.swiper.slideNext();
  }

  prevSlide() {
    this.swiperEl.nativeElement.swiper.slidePrev();
  }

  randomStop() {
    const swiper = this.swiperEl.nativeElement.swiper;
    const totalSlides = swiper.slides.length; // total de elementos de slide no loop
    // Sorteia um índice aleatório. Como está em loop, podemos escolher dentre todos.
    // Note: O Swiper conta os slides de maneira diferente. Normalmente,
    // no loop ele duplica slides, então precisamos considerar apenas o tamanho original.
    // Caso queira apenas do "grupo base", divida o total por 3 se estiver usando loop (depende da config).

    // Para simplificar, consideramos totalSlides/3 pois o loop triplica a quantidade:
    const baseCount = totalSlides / 3;
    const randomIndex = Math.floor(Math.random() * baseCount);

    // Parar o autoplay antes de pular para o slide:
    swiper.autoplay.stop();

    // Ir para o slide sorteado (usando slideToLoop para loop):
    swiper.slideToLoop(randomIndex, 1000); // 1 segundo de transição até parar
  }
}

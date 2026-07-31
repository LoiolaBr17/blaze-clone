import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MineRushComponent } from './mine-rush.component';

describe('MineRushComponent', () => {
  let component: MineRushComponent;
  let fixture: ComponentFixture<MineRushComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MineRushComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MineRushComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

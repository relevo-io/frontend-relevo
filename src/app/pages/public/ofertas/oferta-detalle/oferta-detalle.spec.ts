import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfertaDetalle } from './oferta-detalle.component';

describe('OfertaDetalle', () => {
  let component: OfertaDetalle;
  let fixture: ComponentFixture<OfertaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfertaDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(OfertaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

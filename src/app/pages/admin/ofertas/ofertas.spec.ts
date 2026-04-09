import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Ofertas } from './ofertas';
import { OfertaService } from '../../../services/oferta.service';

describe('OfertasAdmin', () => {
  let component: Ofertas;
  let fixture: ComponentFixture<Ofertas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ofertas, HttpClientTestingModule],
      providers: [OfertaService]
    }).compileComponents();

    fixture = TestBed.createComponent(Ofertas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

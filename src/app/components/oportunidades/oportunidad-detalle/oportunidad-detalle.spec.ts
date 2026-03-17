import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OportunidadDetalle } from './oportunidad-detalle';

describe('OportunidadDetalle', () => {
  let component: OportunidadDetalle;
  let fixture: ComponentFixture<OportunidadDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OportunidadDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(OportunidadDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

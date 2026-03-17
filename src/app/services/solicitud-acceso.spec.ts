import { TestBed } from '@angular/core/testing';

import { SolicitudAccesoService } from './solicitud-acceso.service';

describe('SolicitudAccesoService', () => {
  let service: SolicitudAccesoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolicitudAccesoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { Oportunidad } from './oportunidad';

describe('Oportunidad', () => {
  let service: Oportunidad;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Oportunidad);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

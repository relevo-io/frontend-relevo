import { TestBed } from '@angular/core/testing';

import { Gestion } from './gestion';

describe('Gestion', () => {
  let service: Gestion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Gestion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

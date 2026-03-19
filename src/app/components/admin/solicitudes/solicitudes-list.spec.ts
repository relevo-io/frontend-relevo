import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudesList } from './solicitudes-list';

describe('SolicitudesList', () => {
  let component: SolicitudesList;
  let fixture: ComponentFixture<SolicitudesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesList],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OportunidadList } from './oportunidad-list';

describe('OportunidadList', () => {
  let component: OportunidadList;
  let fixture: ComponentFixture<OportunidadList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OportunidadList],
    }).compileComponents();

    fixture = TestBed.createComponent(OportunidadList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

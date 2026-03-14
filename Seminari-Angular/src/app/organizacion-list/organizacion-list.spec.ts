import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizacionList } from './organizacion-list';

describe('OrganizacionList', () => {
  let component: OrganizacionList;
  let fixture: ComponentFixture<OrganizacionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizacionList],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizacionList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

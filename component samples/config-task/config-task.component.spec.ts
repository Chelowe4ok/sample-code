import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigTaskComponent } from './config-task.component';

describe('ConfigTaskComponent', () => {
  let component: ConfigTaskComponent;
  let fixture: ComponentFixture<ConfigTaskComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigTaskComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

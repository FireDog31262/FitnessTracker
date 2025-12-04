import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PastTraining } from './past-training';
import { appTestingProviders } from '../../../../testing/app-testing-providers';
import { PastTrainingPreferencesService } from './past-training-preferences.service';
import { PastTrainingPreferences } from './past-training-sort.model';

class PastTrainingPreferencesServiceStub {
  loadPreferences(): Promise<PastTrainingPreferences> {
    return Promise.resolve({
      sortOrder: [],
      aerobicFilter: '',
      resistanceFilter: '',
      aerobicPageSize: 5,
      aerobicPageIndex: 0,
      resistancePageSize: 5,
      resistancePageIndex: 0
    });
  }

  savePreferences(_userId: string, _preferences: PastTrainingPreferences): Promise<void> {
    return Promise.resolve();
  }
}

describe('PastTraining', () => {
  let component: PastTraining;
  let fixture: ComponentFixture<PastTraining>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PastTraining],
      providers: [...appTestingProviders(), { provide: PastTrainingPreferencesService, useClass: PastTrainingPreferencesServiceStub }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PastTraining);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

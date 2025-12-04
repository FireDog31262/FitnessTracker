import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { reducers } from './app.reducer';
import { provideEffects } from '@ngrx/effects';
import { UiEffects } from './shared/ui.effects';
import { TrainingEffects } from './Components/training/training.effects';
import { provideServiceWorker } from '@angular/service-worker';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const firebaseConfig = {
  apiKey: "AIzaSyD97S1Gm8DjdBrc_mrmknk0KXvdrqSO42M",
  authDomain: "myangulartraining-dc6c0.firebaseapp.com",
  projectId: "myangulartraining-dc6c0",
  storageBucket: "myangulartraining-dc6c0.firebasestorage.app",
  messagingSenderId: "477692915798",
  appId: "1:477692915798:web:d849c442648b9600ac4bf7"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideStore(reducers),
    provideEffects(UiEffects, TrainingEffects),
    provideCharts(withDefaultRegisterables()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && (typeof window !== 'undefined' ? window.location.hostname !== 'localhost' : true),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};

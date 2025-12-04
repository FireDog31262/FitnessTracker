import { computed, inject, Injectable } from "@angular/core";
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "@angular/fire/auth";
import { AuthData } from "./auth-data.model";
import { User } from "./user.model";
import { Router } from "@angular/router";
import { doc, Firestore, setDoc, getDoc } from '@angular/fire/firestore';
import { Store } from "@ngrx/store";
import * as fromRoot from '../../app.reducer';
import * as UI from '../../shared/ui.actions';
// import * as fromAuth from './auth.reducers';
import * as AuthActions from './auth.actions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly store = inject(Store<fromRoot.State>);
  private readonly userSignal = this.store.selectSignal(fromRoot.getUser);
  private readonly authStatusSignal = this.store.selectSignal(fromRoot.getIsAuthenticated);

  readonly isLoggedIn = computed(() => this.authStatusSignal());

  login(authData: AuthData) {
    this.store.dispatch(new UI.StartLoading());
    signInWithEmailAndPassword(this.auth, authData.email, authData.password)
      .then(async result => {

        // Fetch user profile from Firestore
        const userDocRef = doc(this.firestore, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        const authedUser = this.buildUserFromAuth(result.user.uid, result.user.email, result.user.displayName, userDocSnap.exists() ? userDocSnap.data() : null);
        this.handleAuthSuccess(authedUser, '/training');
      })
      .catch(error => this.handleAuthFailure('Login', error));
  }

  logout() {
    // Navigate first, then clear state to avoid flashing UI
    this.router.navigate(['/']).then(() => {
      signOut(this.auth)
        .then(() => {
          console.log('✅ Firebase logout successful');
          this.store.dispatch(new AuthActions.SetUnauthenticated());
        })
        .catch(error => {
          console.error('❌ Logout error:', error);
          this.store.dispatch(new AuthActions.SetUnauthenticated());
        });
    });
  }

  getUser() {
    const currentUser = this.userSignal();
    return currentUser ? { ...currentUser } : null;
  }

  async updateProfile(userId: string, data: Partial<User>) {
    this.store.dispatch(new UI.StartLoading());
    try {
      const updateData: any = { ...data };
      // Remove id and email from update if present, as they shouldn't be changed here easily
      delete updateData.id;
      delete updateData.email;

      await setDoc(doc(this.firestore, "users", userId), updateData, { merge: true });

      // Update local state
      const currentUser = this.getUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...data };
        this.store.dispatch(new AuthActions.SetAuthenticated({ user: updatedUser }));
      }

      this.store.dispatch(new UI.StopLoading());
      this.store.dispatch(new UI.ShowSnackbar({
        message: 'Profile updated successfully.',
        action: 'Close',
        duration: 3000
      }));
    } catch (error) {
      this.handleAuthFailure('Profile Update', error);
    }
  }

  async registerUser(userData: Omit<User, 'id'> & { password: string }) {
    this.store.dispatch(new UI.StartLoading());
    try {
      // Step 1: Register user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(this.auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      const uid = firebaseUser.uid; // The unique ID from Firebase Authentication!

      const today = new Date();
      const birthDate = userData.birthday;
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        throw new Error('User must be at least 18 years old to register.');
      }
      const userProfileData = {
        email: userData.email,
        name: userData.name,
        birthday: userData.birthday, // Use server timestamp for consistency
        age: age,
        // Add any other initial user profile data here
      };

      // Set the document ID to be the same as the user's UID
      await setDoc(doc(this.firestore, "users", uid), userProfileData);

      const newUser = this.buildUserFromAuth(uid, userData.email, userData.name, userProfileData);
      this.handleAuthSuccess(newUser, '/user-exercises');
      console.log("Successfully registered user and created profile for UID:", uid);
    } catch (error) {
      this.handleAuthFailure('Registration', error);
    }
  }

  private buildUserFromAuth(uid: string, email: string | null, displayName: string | null, firestoreData: Record<string, unknown> | null): User {
    const nameFromProfile = firestoreData?.['name'] ?? displayName ?? '';
    const birthdate = firestoreData?.['birthdate'];
    const currentWeight = (firestoreData?.['currentWeight'] ?? firestoreData?.['weight']) as number | undefined;
    const goalWeight = firestoreData?.['goalWeight'] as number | undefined;
    const weightUnit = firestoreData?.['weightUnit'] as 'kg' | 'lb' | undefined;
    const height = firestoreData?.['height'] as number | undefined;
    const heightUnit = firestoreData?.['heightUnit'] as 'cm' | 'ft_in' | undefined;

    let birthdayDate = new Date();
    if (birthdate) {
      // Firestore Timestamp has toDate method, fallback handles strings/dates
      if (typeof birthdate === 'object' && 'toDate' in birthdate && typeof birthdate['toDate'] === 'function') {
        birthdayDate = birthdate['toDate']();
      } else {
        birthdayDate = new Date(birthdate as string | number | Date);
      }
    }

    return {
      id: uid,
      email: email ?? '',
      name: String(nameFromProfile ?? ''),
      birthday: birthdayDate,
      currentWeight,
      goalWeight,
      weightUnit,
      height,
      heightUnit
    };
  }

  private handleAuthSuccess(user: User, redirectUrl: string) {
    this.store.dispatch(new UI.StopLoading());
    this.store.dispatch(new AuthActions.SetAuthenticated({ user }));
    this.router.navigate([redirectUrl]);
  }

  private handleAuthFailure(context: string, error: unknown) {
    this.store.dispatch(new UI.StopLoading());
    this.store.dispatch(new AuthActions.SetUnauthenticated());
    const msg = this.extractMessage(error);
    this.showErrorSnackbar(`${context} failed: ${msg}`);
    console.error(`❌ ${context} exception:`, msg);
  }

  isAuthenticated() {
    return this.isLoggedIn();
  }

  private showErrorSnackbar(message: string) {
    this.store.dispatch(new UI.ShowSnackbar({
      message,
      action: 'Close',
      duration: 5000
    }));
  }

  private extractMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error ?? 'Unknown error');
  }
}

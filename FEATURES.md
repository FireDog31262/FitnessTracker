# Fitness Tracker Application Features

This document outlines the key features and functionality of the Fitness Tracker application.

## 1. Authentication & User Management

- **Sign Up**: Users can create a new account.
- **Login**: Existing users can log in to access the application.
- **Route Protection**: Access to training features is restricted to authenticated users via `AuthGuard`.

## 2. Training Management

### New Training

- **Exercise Selection**: Users can choose from a list of available exercises.
- **Start Training**: Initiates a new workout session.
- **Loading State**: Visual feedback while fetching available exercises.

### Current Training

- **Live Progress**: Displays a progress spinner indicating the remaining time for the current exercise.
- **Timer**: Automatically tracks the duration of the exercise.
- **Controls**:
  - **Stop/Cancel**: Users can pause and cancel the current training.
  - **Confirmation Dialog**: A dialog prompts the user to confirm cancellation or resume the workout.
- **Completion**: Exercises automatically complete when the timer finishes.

### Past Training (History)

- **Data Table**: Displays a comprehensive list of past exercises including:
  - Date
  - Name
  - Duration
  - Calories
  - State (Completed/Cancelled)
- **Filtering**: Real-time search functionality across multiple fields (Name, State, Date, Duration, Calories).
- **Sorting**:
  - Multi-column sorting support.
  - Toggle between Ascending, Descending, and Default order.
- **Pagination**: Users can navigate through large lists of history with customizable page sizes (5, 10, 20).
- **Preferences Persistence**: User preferences for sorting, filtering, and pagination are automatically saved and restored per user session.

## 3. Navigation & UI

- **Welcome Page**: Landing page for the application.
- **Responsive Navigation**:
  - **Header**: Top navigation bar.
  - **Side Navigation**: Collapsible side menu for mobile/tablet views.
- **Feedback**: Uses Snackbars for notifications (e.g., "Past workouts preferences saved").

## 4. Technical Architecture

- **Framework**: Built with **Angular** (latest version features).
- **Architecture**: Uses **Standalone Components** throughout the application.
- **State Management**:
  - **NgRx** is used for global state (User authentication, UI loading states).
  - **Signals & Effects**: Extensive use of Angular Signals for local component state and reactivity.
- **UI Library**: **Angular Material** components (Tabs, Cards, Buttons, Form Fields, Paginator, Spinner, Dialogs).
- **Performance**: Uses `OnPush` change detection strategy for optimal performance.

## 5. Roadmap / Planned Features

- [x] **Social Sharing**: Allow users to share workout summaries on social media.
- [x] **Charts & Analytics**: Visual graphs showing progress over time (e.g., calories burned per week).
- [x] **User Exercises**: Enable users to add their own custom exercises to the list.
- [x] **Profile Settings**: User profile management (avatar, weight, height).

# Required Firestore Composite Indexes

The following indexes must be manually created in the Firebase Console to support production queries.

## 1. Task Claims Management
- **Collection**: `task_claims`
- **Fields**:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- **Status**: REQUIRED for Admin User Details & History

## 2. Market Prediction History
- **Collection Group**: `user_predictions`
- **Fields**:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- **Status**: REQUIRED for Admin User Details & History

## 3. Global Activity Feed
- **Collection Group**: `activities`
- **Fields**:
  - `userId` (Ascending)
  - `timestamp` (Descending)
- **Status**: REQUIRED for Profile & Admin Activity

## 4. Withdrawal Queue
- **Collection**: `withdrawals`
- **Fields**:
  - `status` (Ascending)
  - `createdAt` (Descending)
- **Status**: REQUIRED for Admin Withdrawal Management

## 5. System Claims Search
- **Collection**: `system_claims`
- **Fields**:
  - `userId` (Ascending)
  - `executedAt` (Descending)
- **Status**: REQUIRED for Economy Reconciliation

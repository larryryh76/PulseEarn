
export const mapAuthError = (error: any): string => {
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is not valid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/operation-not-allowed':
      return 'This operation is currently not allowed. Please contact support.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 8 characters with a mix of symbols.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection.';
    case 'auth/internal-error':
      return 'A system error occurred during authentication. Please try again later.';
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
};

export const mapSystemError = (error: string): string => {
  if (error === 'REWARD_ALREADY_CLAIMED') return 'You have already claimed this reward.';
  if (error === 'INSUFFICIENT_FUNDS') return 'You do not have enough points for this action.';
  if (error === 'COOLDOWN_ACTIVE') return 'Please wait before trying this action again.';
  if (error === 'DAILY_REWARD_COOLDOWN') return 'You have already claimed your daily reward today.';
  if (error === 'RACE_CONDITION_DETECTED') return 'Action in progress. Please wait.';
  if (error === 'ENTITY_NOT_FOUND') return 'User record not found. Please re-login.';

  return 'Communication failed. Please try again in a moment.';
};

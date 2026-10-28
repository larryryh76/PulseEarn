import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const auth = read('src/contexts/AuthContext.tsx');
const pulseLogin = read('src/pages/Login.tsx');
const pulseSignup = read('src/pages/Signup.tsx');
const pseAuth = read('src/pages/psemine/PSEmineAuth.tsx');
const pseContext = read('src/contexts/PSEMineAuthContext.tsx');
const app = read('src/App.tsx');
const pulseProduct = read('src/contexts/PulseEarnProductContext.tsx');
const pseEngine = read('src/engines/psemine/PSEMineEngine.ts');
const api = read('api/index.py');

const googleLogin = auth.slice(auth.indexOf('async function signInWithGoogle'), auth.indexOf('async function signUpWithGoogle'));
assert.match(googleLogin, /getAdditionalUserInfo\(result\)\?\.isNewUser/);
assert.match(googleLogin, /deleteUser\(result\.user\)/);
assert.doesNotMatch(googleLogin, /initializeUserProfile\(/, 'Google sign-in must never provision a new product identity');

const googleSignup = auth.slice(auth.indexOf('async function signUpWithGoogle'), auth.indexOf('function login('));
assert.match(googleSignup, /initializeUserProfile\(/, 'explicit Google signup provisions the profile');
const emailLogin = auth.slice(auth.indexOf('function login('), auth.indexOf('async function logout('));
assert.match(emailLogin, /signInWithEmailAndPassword/);
assert.doesNotMatch(emailLogin, /createUserWithEmailAndPassword/);
assert.match(auth, /rejectedGoogleLoginUids\.current\.add\(result\.user\.uid\)/, 'profile repair must be suppressed for a new Google identity on login');
assert.match(pulseLogin, /await signInWithGoogle\(\)/);
assert.match(pulseSignup, /await signUpWithGoogle\(ref, 'pulseearn', true\)/);
assert.match(pulseSignup, /if \(!acceptedTerms\)/, 'PulseEarn email and Google signup must require consent');
assert.match(auth, /termsAcceptedAt: serverTimestamp\(\)/);
assert.match(auth, /if \(!termsAccepted\)/, 'shared identity layer must enforce consent');
assert.match(pseContext, /identitySignup\(email, password, username, referralCode, 'psemine', true\)/);
assert.match(pseContext, /identityGoogleSignUp\(referralCode, 'psemine', true\)/);

assert.match(pseAuth, /if \(isSignup && !agreed\)/, 'PSEmine Google signup must require legal agreement');
assert.match(pseAuth, /if \(isSignup\) await signUpWithGoogle\(refFromQuery\);\s*else await signInWithGoogle\(\)/);
assert.match(pseContext, /await identityGoogleSignIn\(\)/);
assert.doesNotMatch(pseContext.slice(pseContext.indexOf('const googleSignIn'), pseContext.indexOf('const googleSignUp')), /PSEMineEngine\.enroll|registerReferral/);

assert.match(app, /import\.meta\.env\.DEV && localStorage\.getItem\('pulseearn-test-bypass'\)/);
assert.match(app, /if \(!currentUser\.emailVerified && !isTestBypass/);
assert.match(app, /if \(!currentUser\.emailVerified\) return <Navigate to="\/verify-email" replace \/>/);
assert.match(pulseProduct, /if \(!currentUser\.emailVerified\) return/);
assert.match(pulseProduct, /signupOnboardingPending/);
assert.match(pulseProduct, /system_claims/);
assert.match(auth, /pendingPsemineEnrollment: true/);
assert.match(pseContext, /pendingEnrollmentHandledUidRef/);
assert.doesNotMatch(pseContext.slice(pseContext.indexOf('const signupWithReferral'), pseContext.indexOf('const googleSignIn')), /PSEMineEngine\.enroll\(\)/, 'email signup must defer enrollment');
assert.doesNotMatch(pseContext.slice(pseContext.indexOf('const googleSignUp'), pseContext.indexOf('const enrolling')), /PSEMineEngine\.enroll\(\)/, 'Google signup must defer enrollment');
assert.match(pseEngine, /queuePendingReferral\(codeInput: string\)/);
assert.match(api, /if not allow_unverified and not decoded_token\.get\('email_verified', False\)/);
assert.equal((api.match(/@verify_token\(allow_unverified=True\)/g) || []).length, 2, 'only verification-email dispatch routes may accept unverified tokens');
assert.match(api, /if not request\.user\.get\('email_verified', False\)/, 'legacy PSEmine financial writes must require verified email');
assert.match(api, /'pendingPsemineEnrollment': False/, 'server clears the pending marker only when enrollment succeeds');
console.log('Auth contract checks passed: sign-in cannot silently register; signup, verification and product boundaries are explicit.');

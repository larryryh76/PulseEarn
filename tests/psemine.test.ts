import { describe, test, expect } from 'bun:test';
import fs from 'fs';

describe('PSEmine Firestore Rules & Isolation Checks', () => {
  const rulesContent = fs.readFileSync('firestore.rules', 'utf-8');

  test('psemine_profiles rule exists and enforces isOwner', () => {
    expect(rulesContent).toContain('match /psemine_profiles/{profileId}');
    expect(rulesContent).toContain('allow read: if isOwner(profileId) || isAdmin();');
    expect(rulesContent).toContain('isOwner(profileId)');
  });

  test('psemine_profiles create enforces strict schema fields', () => {
    expect(rulesContent).toContain("request.resource.data.keys().hasOnly([\n                        'uid', 'email', 'username', 'hasCompletedGuide', 'createdAt', 'updatedAt'\n                      ])");
  });

  test('psemine_profiles update prevents changing uid and limits updated fields', () => {
    expect(rulesContent).toContain('request.resource.data.uid == resource.data.uid');
    expect(rulesContent).toContain("request.resource.data.diff(resource.data).affectedKeys().hasOnly([\n                        'email', 'username', 'hasCompletedGuide', 'updatedAt'\n                      ])");
  });

  test('psemine_profiles does not allow broad read/write', () => {
    expect(rulesContent).not.toContain('match /psemine_profiles/{profileId} {\n      allow read, write: if request.auth != null;');
  });

  test('PulseEarn fields are not present in PSEmine profile type definitions', () => {
    const authContext = fs.readFileSync('src/contexts/PsemineAuthContext.tsx', 'utf-8');
    expect(authContext).not.toContain('points:');
    expect(authContext).not.toContain('xp:');
    expect(authContext).not.toContain('streak:');
    expect(authContext).not.toContain('referralCode:');
  });

  test('PulseEarn AuthContext prevents auto-healing and checkDailyReward on PSEmine routes', () => {
    const authContext = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf-8');
    expect(authContext).toContain("if (window.location.pathname.startsWith('/mine')) return;");
  });
});

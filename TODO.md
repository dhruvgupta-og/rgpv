# Admin Analytics Enhancement Progress

**OTA Integration (Complete)**
- [x] lib/updates.tsx & app/_layout.tsx integration
- [x] expo-updates installed & tested

**Admin Analytics Dashboard (In Progress)**
- [ ] Add "User Analytics" card to app/admin/index.tsx (link to users list → detail page)
- [ ] Create app/admin/user-analytics/index.tsx (users overview table with screen time sorting)
- [ ] Enhance user-analytics/[deviceId].tsx with charts (session timeline, screen time pie, profile data)
- [ ] Backend: Ensure storage.getAllUserAnalytics returns profile-joined data (name/branch/year if available)
- [ ] Add global analytics overview page (app/admin/analytics)
- [ ] Test with sample data generation

**Follow-up:** Installations complete, test `npx expo start`, generate test data, build APK.

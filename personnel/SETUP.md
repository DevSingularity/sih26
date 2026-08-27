# Setup — PolarOps Personnel App

This gets you from a fresh clone to a running app on an emulator/device.
The repo currently ships `lib/`, `pubspec.yaml`, `analysis_options.yaml`
and `.gitignore` only — there is **no `android/`, `ios/`, `web/`, etc.
folder yet**. Step 2 below generates those from your local Flutter SDK,
which is the only reliable way to produce them (they're
version/toolchain-specific, so hand-authoring them tends to bit-rot).

---

## 0. Prerequisites

- **Flutter SDK 3.35 or newer** (this project's `pubspec.yaml` sets
  `environment.flutter: '>=3.35.0'`). Install/update via
  [flutter.dev/get-started](https://docs.flutter.dev/get-started/install)
  or, if you already have Flutter, `flutter upgrade`.
- Confirm your toolchain:
  ```
  flutter --version
  flutter doctor
  ```
  Resolve anything `flutter doctor` flags (Android toolchain, Xcode,
  CocoaPods, etc.) before continuing — codegen in step 4 will still
  work without a device, but you'll need at least one platform fully
  green to actually run the app in step 5.
- An emulator/simulator or physical device. For the camera-scan
  provisioning flow (Cargo Handling / QR setup) you'll want a real
  device or an emulator with a virtual/webcam-backed camera —
  the manual-entry fallback on the setup screen works everywhere else.

---

## 1. Install dependencies

```
cd personnel
flutter pub get
```

### Version notes

`pubspec.yaml`'s dependency floors were refreshed against the latest
I could confirm, but I don't have live access to pub.dev from where
I'm generating this — I verified `dio` (5.11.0) and `geolocator`
(14.0.3) directly against their GitHub release tags; the rest are my
best current estimate. **Right after `pub get`, run:**

```
flutter pub outdated
flutter pub upgrade --major-versions
```

`pub upgrade --major-versions` will pull whatever is genuinely newest
on pub.dev at the moment you run it — more reliable than any version
number hardcoded here. Two packages jumped a **major** version
recently and are worth a quick changelog skim if `pub upgrade` moves
you further than the floors already in `pubspec.yaml`:

- `geolocator` (13.x → 14.x)
- `workmanager` (0.5.x → 0.6.x — background task registration API
  changed shape)

Neither is wired into app code yet (they land in Milestone 3/4 — the
location rollup job and sync engine background loop), so bumping them
now costs nothing; just use the current API shape from each
package's docs when you get there instead of anything you might find
in older tutorials.

---

## 2. Generate the platform folders

```
flutter create . --project-name polarops_personnel_app --org com.polarops.personnel
```

Running `flutter create` **in an existing project directory** (note
the `.`) is non-destructive — it only adds the platform scaffolding
(`android/`, `ios/`, `macos/`, `linux/`, `windows/`, `web/`, `test/`,
`.metadata`) that's missing; it will not touch your existing `lib/`,
`pubspec.yaml`, or `analysis_options.yaml`. Adjust `--org` to whatever
reverse-DNS you actually want the app's bundle/application ID under
(this becomes `com.polarops.personnel.polarops_personnel_app` — sanity
check it in `android/app/build.gradle` / `ios/Runner.xcodeproj`
afterward and rename if needed).

If you only need specific platforms (e.g. Android + iOS, skipping
desktop/web), add `--platforms=android,ios`.

---

## 3. Add required permissions

This app's feature set (per the build prompt) needs camera, location,
and background-execution permissions that `flutter create` doesn't
add for you. Add these once, right after step 2:

### Android — `android/app/src/main/AndroidManifest.xml`

Add inside the `<manifest>` tag, above `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

### iOS — `ios/Runner/Info.plist`

Add inside the outermost `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Used to scan cargo barcodes/QR codes and the station setup QR code.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used to record your location during field work.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Used to keep recording your location in the background during field work.</string>
```

You'll revisit both files again in Milestone 3/4 when the background
location-rollup job and sync engine are wired in (`workmanager` on
Android additionally needs a bit of `AndroidManifest.xml` service/
receiver registration at that point — its own README covers the exact
block for whatever version `pub upgrade` lands you on).

---

## 4. Generate Drift's code (`*.g.dart`)

`lib/data/local/database.dart` declares `part 'database.g.dart';` —
that file doesn't exist yet; drift's code generator writes it from
the table classes in `lib/data/local/tables/`.

```
dart run build_runner build --delete-conflicting-outputs
```

Re-run this any time you add/change a Drift table or a `@DriftDatabase`
tables list. For active development, run the watcher instead so it
regenerates on save:

```
dart run build_runner watch --delete-conflicting-outputs
```

If this step fails, it's almost always one of:
- `flutter pub get` wasn't run first (step 1)
- a table file has a typo the analyzer would have caught — run
  `flutter analyze` first for a clearer error than build_runner gives

---

## 5. Run it

```
flutter devices        # confirm a target is attached/booted
flutter run
```

First launch with an empty database routes to the device-setup
screen (`AuthScreen`) — either scan a station-issued QR code or use
the manual-entry form. Once that succeeds, the app writes the one
`self_profile` row and routes to the home shell; killing and
reopening the app from here on skips setup entirely (that's the
point — no "log in every session" flow).

To reset provisioning during testing (simulate a brand-new device)
without reinstalling:

```
flutter clean
flutter pub get
flutter run
```

or just uninstall/reinstall the app on the device/emulator, which
wipes its app-sandboxed SQLite file.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Target of URI doesn't exist: 'database.g.dart'` | Skipped step 4 |
| `No pubspec.lock found` / dependency resolution errors | Skipped step 1, or a version floor in `pubspec.yaml` doesn't exist yet on pub.dev — loosen that one constraint and retry |
| `flutter create .` refuses to run / complains about existing files | You're not in the `personnel/` directory, or a stray `android`/`ios` folder already exists from a previous partial attempt — delete it and retry |
| Camera permission denial on first QR scan | Permission block from step 3 wasn't added, or the app needs a reinstall for a newly-added Android manifest permission to take effect |
| `MissingPluginException` for `mobile_scanner`/`geolocator`/etc. | Almost always a stale build — `flutter clean && flutter pub get && flutter run` |

If you hit something not listed here, `flutter doctor -v` and
`flutter analyze` are the two commands worth running before anything
else — most setup failures show up in one of the two.

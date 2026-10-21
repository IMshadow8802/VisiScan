#!/usr/bin/env bash
# Archives the iOS app and uploads it to App Store Connect (lands in TestFlight).
# Uses the Apple account signed in to Xcode. Run: pnpm ship:ios
set -euo pipefail
cd "$(dirname "$0")/.."

# ponytail: timestamp build number is always higher than the last, no counter to keep
BUILD=$(date +%Y%m%d%H%M)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" ios/VisiScan/Info.plist

OUT=ios/build/ship
rm -rf "$OUT"

xcodebuild -workspace ios/VisiScan.xcworkspace -scheme VisiScan \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$OUT/VisiScan.xcarchive" -allowProvisioningUpdates -quiet archive

xcodebuild -exportArchive -archivePath "$OUT/VisiScan.xcarchive" \
  -exportOptionsPlist scripts/ExportOptions.plist -exportPath "$OUT" \
  -allowProvisioningUpdates

echo "Uploaded build $BUILD. It shows in TestFlight after Apple finishes processing (5-15 min)."

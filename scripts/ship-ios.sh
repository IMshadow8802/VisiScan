#!/usr/bin/env bash
# Archives the iOS app and uploads it to App Store Connect (lands in TestFlight).
# Signs in with an App Store Connect API key (no 2FA), set in ~/.zshrc:
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (path to the AuthKey_*.p8)
# Run: pnpm ship:ios
set -euo pipefail
cd "$(dirname "$0")/.."

AUTH=(-authenticationKeyPath "${ASC_KEY_PATH:?set ASC_KEY_PATH in ~/.zshrc}"
  -authenticationKeyID "${ASC_KEY_ID:?set ASC_KEY_ID in ~/.zshrc}"
  -authenticationKeyIssuerID "${ASC_ISSUER_ID:?set ASC_ISSUER_ID in ~/.zshrc}")

# ponytail: timestamp build number is always higher than the last, no counter to keep
BUILD=$(date +%Y%m%d%H%M)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" ios/VisiScan/Info.plist

OUT=ios/build/ship
rm -rf "$OUT"

xcodebuild -workspace ios/VisiScan.xcworkspace -scheme VisiScan \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$OUT/VisiScan.xcarchive" -allowProvisioningUpdates "${AUTH[@]}" -quiet archive

xcodebuild -exportArchive -archivePath "$OUT/VisiScan.xcarchive" \
  -exportOptionsPlist scripts/ExportOptions.plist -exportPath "$OUT" \
  -allowProvisioningUpdates "${AUTH[@]}"

echo "Uploaded build $BUILD. It shows in TestFlight after Apple finishes processing (5-15 min)."

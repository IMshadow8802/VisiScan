// Build number = build date + time, readable: Y MM DD HH mm, Y = years since 2020.
// 610232146 -> 2026-10-23 21:46. Same on Android and iOS; under Play's cap until end of 2040.
// ship-ios refuses to upload unless this is here and ios/ carries a valid stamp.
const pad = (n) => String(n).padStart(2, '0');
const buildStamp = (d = new Date()) =>
  Number(`${d.getFullYear() - 2020}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`);

module.exports = ({ config }) => {
  const build = buildStamp();
  return {
    ...config,
    ios: { ...config.ios, buildNumber: String(build) },
    android: { ...config.android, versionCode: build },
  };
};

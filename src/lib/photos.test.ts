import { resizeTarget } from './photos';

describe('resizeTarget', () => {
  it('fits the longest edge', () => {
    expect(resizeTarget(3200, 2000)).toEqual({ width: 1600 });
    expect(resizeTarget(2000, 3200)).toEqual({ height: 1600 });
  });
  it('never upscales', () => {
    expect(resizeTarget(1600, 900)).toBeNull();
    expect(resizeTarget(800, 600)).toBeNull();
  });
});

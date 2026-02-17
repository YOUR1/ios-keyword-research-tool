import "@testing-library/jest-dom";

// Radix UI components (e.g. Slider) require ResizeObserver which jsdom lacks
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

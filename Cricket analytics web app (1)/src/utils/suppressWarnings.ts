// Suppress known Recharts duplicate key warnings
// This is a known issue with Recharts library and doesn't affect functionality

const originalError = console.error;

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Encountered two children with the same key')
  ) {
    return;
  }
  originalError.apply(console, args);
};

export {};

export const UNDO_WINDOW_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_UNDO_WINDOW_MS ?? '10000',
  10,
);

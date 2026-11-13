/* Aminas — Phase 15B species work on top of the finer grid (see src/voxel-roster15.js). Each hook receives the model
   its own builder just sculpted (stage, detail factor d) and adds what the brief asks for that line. Coordinates are
   the builder's own: multiply its unit sizes by its scale k × d. */
(function (root) {
  'use strict';
  const A = root.A, V = A && A.Voxel, K = V && V.kit; if (!V || !K) return;
  const H = (V.ROSTER15_HOOKS = V.ROSTER15_HOOKS || {});
})(typeof window !== 'undefined' ? window : globalThis);

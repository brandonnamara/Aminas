// Phase 18C stability fixes found while investigating intermittent checks (rule level; no real device involved).
const { load, ok, done } = require('./harness');
const c = load(), P = c.A.Perf;
// the display-rate estimate: a page whose light frames arrive every ~50 ms is not "a 20 fps screen" (that let a
// struggling device off in browser-perf-fix); 30 fps caps and 60 fps screens read as before
P._resetDisplay(); for (let i = 0; i < 40; i++) P.noteFrame(50 + (i % 3));
ok(P.displayInfo().fps === 60 && !P.displayInfo().steady, 'steady ~50 ms frames keep the 60 fps assumption, so heavy frames are still judged slow');
P._resetDisplay(); for (let i = 0; i < 40; i++) P.noteFrame(41 + (i % 2));
ok(P.displayInfo().fps === 60 && !P.displayInfo().steady, 'nor do steady ~42 ms frames (24 fps)');
P._resetDisplay(); for (let i = 0; i < 40; i++) P.noteFrame(33.3 + (i % 2) * 0.6);
ok(P.displayInfo().fps === 30 && P.displayInfo().steady, 'a page capped at 30 fps still reads as 30 fps (Low Power Mode, in-app browsers)');
P._resetDisplay(); for (let i = 0; i < 40; i++) P.noteFrame(16.7);
ok(P.displayInfo().fps === 60 && P.displayInfo().steady, 'a 60 fps screen reads as 60 fps');
P._resetDisplay(); for (let i = 0; i < 40; i++) P.noteFrame(25);
ok(P.displayInfo().fps === 40 && P.displayInfo().steady, 'a 40 fps cap still reads as 40 fps');
P._resetDisplay();
done('stability18c');

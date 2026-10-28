| Scenario | Main thread ms/s | Script ms/s | Paints/s | Raster tasks/s | 3D draw calls | 3D triangles |
|---|---|---|---|---|---|---|
| title screen (idle) | 5.5 → 5.2 | 0 → 0 | 0 → 0 | 0 → 0 | – → – | – → – |
| island idle (no input) | 63.5 → 61.3 | 1.4 → 0.8 | 43.2 → 36.8 | 12.9 → 9.2 | – → – | – → – |
| creature page with live 3D viewer, idle | 297.8 → 293.2 | 12 → 13.2 | 0 → 0 | 0 → 0 | 4 → 4 | 2392 → 2392 |
| 3D battle, waiting for input | 1004 → 1011.4 | 20.8 → 16.3 | 57.3 → 34.8 | 0 → 0.4 | 13 → 12 | 7268 → 7864 |
| 3D battle in a small window, idle (frame budget visible) | 392.5 → 619.4 | 13.6 → 17.3 | 120.5 → 120.7 | 0.3 → 0 | 13 → 12 | 7268 → 7864 |
| 3D battle in a small window, during an attack | 435.1 → 688.2 | 34.9 → 39.1 | 118.7 → 117.3 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| game hidden during a battle (simulated visibilitychange) | 0.2 → 0.3 | 0 → 0 | 0 → 0 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| battle after returning (and 5 more hide/show cycles) | 994.3 → 1013.8 | 16.7 → 13.8 | 72.4 → 39.2 | 0 → 0 | 13 → 12 | 7268 → 7864 |
| Island Boss battle (Heartwood 10/10), waiting for input | 1000.8 → 1009.9 | 22.9 → 23.5 | 77.3 → 52.9 | 51.5 → 35.5 | 18 → 21 | 8254 → 9558 |
| island after 9 battles (idle) | 53.7 → 52.4 | 0.5 → 0.6 | 59 → 40.2 | 17.8 → 17.3 | 13 → 12 | 7268 → 7864 |

Heap growth after 9 battles: 0.8 MB (Dev 7) → 0.7 MB (Dev 8). Live intervals on the island: 4 → 4.

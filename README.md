# FastLane Mechanic

Business manager for **FastLane Mechanic** (GTA V RP) — Craft, Sales, Employees, Rate card.

Owner: **Pablo the II Escobar**

Craft output is **stash needed** for the selected blueprint and quantity.

## Local

```bash
npm install
npm run db:migrate:local
npm run dev
```

Employee desk: add `?role=employee`. Owner PIN: `sujal@3301`

## Craft catalog so far

| Item | Stash needed (1×) |
|---|---|
| **Engine Stage 1** | 27 Scrap Metal, 17 Scrap Tin, 17 Steel Plate, 15 Broken Carparts, 20 Polymer Strip, 48 Circuit Bundle, 12 Lightweight Metal |
| **Engine Stage 2** | 30 Scrap Metal, 18 Scrap Tin, 18 Steel Plate, 18 Broken Carparts, 23 Polymer Strip, 50 Circuit Bundle, 12 Lightweight Metal |
| **Engine Stage 3** | 35 Scrap Metal, 20 Scrap Tin, 20 Steel Plate, 20 Broken Carparts, 25 Polymer Strip, 55 Circuit Bundle, 12 Lightweight Metal |
| **Engine Stage 4** | 40 Scrap Metal, 25 Scrap Tin, 25 Steel Plate, 22 Broken Carparts, 30 Polymer Strip, 65 Circuit Bundle, 14 Lightweight Metal |
| **Stage 3 Supercharger** | 40 Scrap Metal, 25 Scrap Tin, 25 Steel Plate, 22 Broken Carparts, 30 Polymer Strip, 65 Circuit Bundle, 14 Lightweight Metal |
| **Stage 4 Supercharger** | 40 Scrap Metal, 25 Scrap Tin, 25 Steel Plate, 22 Broken Carparts, 30 Polymer Strip, 65 Circuit Bundle, 14 Lightweight Metal |
| **27mm Turbo** | 40 Scrap Metal, 25 Scrap Tin, 25 Steel Plate, 22 Broken Carparts, 30 Polymer Strip, 65 Circuit Bundle, 14 Lightweight Metal |
| **Repair Kit** | 5 Scrap Metal, 3 Steel Plate, 4 Circuit Bundle, 4 Polymer Strip |
| **Advanced Repair Kit** | 7 Scrap Metal, 5 Steel Plate, 5 Circuit Bundle, 5 Polymer Strip |
| **Body Repair Kit** | 10 Scrap Metal, 10 Steel Plate, 5 Circuit Bundle, 5 Polymer Strip |
| **Alternator Repair Kit** | 20 Polymer Strip, 25 Steel Plate (10+15 on screenshot), 15 Circuit Bundle |
| **Fuel Pump Repair Kit** | 20 Scrap Metal, 25 Polymer Strip, 20 Steel Plate (10+10 on screenshot) |
| **Radiator Repair Kit** | 25 Scrap Metal, 20 Circuit Bundle, 25 Steel Plate (10+15 on screenshot) |
| **Gearbox Repair Kit** | 50 Steel Plate (10+15+25 on screenshot), 15 Circuit Bundle |
| **Turbo Repair Kit** | 25 Steel Plate (10+15 on screenshot), 30 Scrap Metal, 30 Circuit Bundle |
| **Brake Repair Kit** | 50 Steel Plate (10+15+25 on screenshot), 25 Scrap Metal, 10 Polymer Strip |
| **Suspension Repair Kit** | 45 Steel Plate (10+15+20 on screenshot), 25 Circuit Bundle, 15 Polymer Strip |
| **Clutch Repair Kit** | 40 Steel Plate (10+15+15 on screenshot), 15 Circuit Bundle, 10 Polymer Strip, 20 Scrap Tin |
| **Armor Plate** | 40 Steel Plate (10+15+15), 40 Scrap Metal, 20 Scrap Tin, 22 Broken Carparts, 30 Polymer Strip, 50 Circuit Bundle, 14 Lightweight Metal |
| **Engine Pistons** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Radiator** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Fuel Pump** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Alternator Battery** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Brake Parts** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Suspension Parts** | 40 Steel Plate (10+15+15), 40 Scrap Metal, 20 Scrap Tin, 22 Broken Carparts, 30 Polymer Strip, 50 Circuit Bundle, 14 Lightweight Metal |
| **Clutch** | 25 Steel Plate (10+15 on screenshot), 25 Scrap Tin, 25 Broken Carparts |
| **Gearbox Parts** | 25 Steel Plate (10+15 on screenshot), 50 Lightweight Metal, 50 Circuit Bundle, 25 Polymer Strip, 25 Scrap Tin |
| **Spoiler Part** | 35 Steel Plate (10+15+10), 17 Scrap Metal, 11 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 30 Circuit Bundle, 7 Lightweight Metal |
| **Front Bumper** | 34 Steel Plate (10+15+9), 15 Scrap Metal, 8 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |
| **Rear Bumper** | 34 Steel Plate (10+15+9), 15 Scrap Metal, 8 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |
| **Side Skirt** | 34 Steel Plate (10+15+9), 15 Scrap Metal, 8 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |
| **Grille** | 34 Steel Plate (10+15+9), 15 Scrap Metal, 8 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |
| **Hood** | 37 Steel Plate (10+15+12), 15 Scrap Metal, 10 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |
| **Roof Part** | 37 Steel Plate (10+15+12), 15 Scrap Metal, 10 Scrap Tin, 10 Broken Carparts, 12 Polymer Strip, 20 Circuit Bundle, 7 Lightweight Metal |

Paste the next blueprint screenshot to add Fender / remaining parts.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** — Worker `fastlane-mechanic`, D1 `fastlane-mechanic`.

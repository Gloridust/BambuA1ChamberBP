# BambuA1ChamberBP · Wooden enclosure for the Bambu Lab A1

[中文](README.md) | **English**

A paulownia-strip frame with a flat wooden base, 3 mm clear panels on the other five sides and a hinged front door, built for the Bambu Lab A1 (not the mini).

- **Interactive 3D model:** [`docs/index.html`](docs/index.html). Open it in a browser, or point GitHub Pages at the `/docs` folder of the `main` branch. You can open the door, explode the model, step through the assembly and tap any part for its spec. Changing a frame size recalculates the BOM and the clearance checks. The page has a 中文 / EN switch.
- **Shopping list:** [`bom.en.csv`](bom.en.csv) (English) or [`bom.csv`](bom.csv) (Chinese). Both open in Excel or Numbers.

> Bambu Lab does not recommend enclosing the A1. This enclosure is for dust, noise, drafts and pets. For PLA, keep the inside below 35 °C by running the exhaust fan or leaving the door ajar. The A1 is not well suited to ABS or ASA.

---

## 1. Review of the original plan

Original plan: 650×650×15 base, four 30×40×600 posts, a top frame of 2 × 640 + 2 × 580, four 640×630 clear panels, a 646×646 top panel, and a door made from a single clear panel on hinges.

| # | Problem | Effect | Change |
|---|---|---|---|
| 1 | **Not deep enough:** inner depth 640 − 2×30 = 580 mm | The A1 bed sweeps about 545 mm front to back (it reaches about 80 mm past the front of the base). That leaves about 17 mm at each end, and the power cable plugs in at the back | Frame depth **700**, inner depth 640, about 47 mm clearance front and back |
| 2 | **No bottom frame** | The bottom edges of the panels and the door have no wood to fix or seal against, so the 3 mm sheets bow out and leak air. The posts only hold by screws into 15 mm of soft paulownia | Add a **bottom frame** identical to the top frame (4 strips) |
| 3 | **Heights don't match** | With the 30×40 top frame on edge, the frame is 600 + 40 = 640 tall, but the panels are 630 | Frame 680 tall (40 bottom frame + 600 post + 40 top frame); side and back panels 680 |
| 4 | **Door is a single 3 mm sheet** | A sheet about 646×640 sags noticeably, and M3 hinge bolts straight through acrylic crack the holes | **Framed door:** 30×40 frame with the panel on it, so hinges and magnets screw into wood |
| 5 | **4.5 mm panel holes** | Acrylic and PC expand about 10× more than wood. A 700 mm panel grows about 1.5 mm over a 30 °C rise. An ST4 screw in a 4.5 mm hole has almost no room, so the panel cracks at the holes | **Ø6** holes with 12 mm OD nylon washers |
| 6 | **Surface magnetic catch** | The catch is thick enough to hold the door off the seal | **Ø10×3 neodymium magnets set flush** into the right post and the back of the door |
| 7 | **No cable entry or heat exhaust** | The power cable and the AMS lite's PTFE tube and cable have no way in | Ø50 brush grommets in the back and top panels; optional 120 mm exhaust fan |

Two more recommendations:

- **For a clear view, skip twin-wall polycarbonate.** Twin-wall PC (the hollow "sunlight board") is translucent with vertical ribs, so you can't see the print. Use **cast acrylic** (clear and cheap) or **solid polycarbonate** (impact-resistant and hard to crack; the best choice for the door).
- **Keep the AMS lite outside, on the right.** It doesn't fit inside, and a 3 mm top panel can't carry it with four spools. The door opens to the left, so leave room on that side.

---

## 2. Revised dimensions

| Item | Size (mm) |
|---|---|
| Frame (outside of the wood) | 640 W × 700 D × 680 H |
| Inside clear space | W 580 · D 640 · H 640 (base to underside of the top frame) |
| Finished size | about 650 × 741 (with door) × 708 (with feet and top panel) |
| A1 clearance | about 98 each side (385 body), about 47 front and back (545 bed travel), about 210 on top |
| Door swing | 646 wide; fully open it needs about 650 to the left or in front |

Placement: centre the A1 with its front feet at least 90 mm from the inside of the front frame.

### Options: filament feed and power entry

Switch these at the top of the Controls tab in the 3D model; the model, checks and BOM update together.

**Filament feed**

| Option | Posts | Inner height | Total height | Notes |
|---|---|---|---|---|
| AMS lite outside (default) | 600 | 640 | 708 | AMS lite on the right outside; PTFE tube and cable through a Ø50 grommet in the top |
| Stock spool on top | **680** | 720 | 788 | The stock holder sits on top of the printer, making it about 630 mm tall (430 body + ~200 spool). With 600 mm posts the inside is only 640 mm tall, leaving about 10 mm above the spool, too little to lift it off. No top grommet needed |
| Spool stand outside | 600 | 640 | 708 | Desktop spool stand to the right; PTFE tube through the top grommet; change spools without opening the door |

For the stock-spool-on-top option, change only these lines of the default BOM:

| # | Part | Change to | Qty |
|---|---|---|---|
| A | Post | 30×40×**680** | 4 |
| D | Door stile | 30×40×**763** | 2 |
| P1 | Side panel | 700×**760** | 2 |
| P2 | Back panel | 646×**760** | 1 |
| P4 | Door panel | 646×**763** | 1 |
| P3 | Top panel | 646×703, **no grommet hole** | 1 |
| H3 / H4 | Panel screws / washers | 88 holes, buy **110** of each | |
| H12 | Brush grommet | Back panel only | 1 |

Strips total about 10.5 m, still six 2 m lengths: `763+763` · `680+680+566` ×2 · `640+640+640` ×2 · `640+640`.

**Power entry** (both at the back right, near the A1's power socket)

| Option | How | Best for |
|---|---|---|
| Hole in back panel (default) | Ø50 hole in the lower right of the back panel with a brush grommet, centre about 120 mm above the desk | Have the panel supplier cut it; no woodwork |
| Notch in bottom rail | Cut a 60×25 mm notch under the bottom back rail (two saw cuts, chisel out the middle) and a matching notch in the back panel edge; seal with a brush strip. Unplug the cable at the A1 end to thread it through | Easier if you're cutting the wood yourself; no round hole in the panel |

---

## 3. Final BOM

### 1. Wood (paulownia 30×40 strips, sanded on four sides, cut to ±1 mm)

| # | Part | Size | Qty | Notes |
|---|---|---|---|---|
| A | Post | 30×40×600 | 4 | 30 mm face to front/back; stands on the bottom frame |
| B | Top/bottom frame, front & back rail | 30×40×640 | 4 | Full length, 40 mm on edge |
| C | Top/bottom frame, side rail | 30×40×640 | 4 | Fits between the front and back rails |
| D | Door stile | 30×40×683 | 2 | 40 mm face to the front, full height |
| E | Door rail | 30×40×566 | 2 | Fits between the stiles |
| F | Base board | Paulownia panel 650×705×15 | 1 | Bottom frame screwed on from below with 4×40 screws |

The strips add up to about **10.0 m**. Cutting plan on 2 m stock (3 mm kerf), 6 lengths:

```
#1  640 | 640 | 640
#2  640 | 640 | 640
#3  683 | 683 | 600
#4  640 | 640 | 600
#5  600 | 600 | 566
#6  566
```

### 2. Clear panels (3 mm cast acrylic or solid polycarbonate)

| # | Part | Size | Qty | Holes |
|---|---|---|---|---|
| P1 | Side panel (L/R) | 700×680 | 2 | 16 each |
| P2 | Back panel | 646×680 | 1 | 16 + Ø50 grommet (lower right); optional Ø116 fan hole (upper left) |
| P3 | Top panel | 646×703 | 1 | 16 + Ø50 grommet (back right) |
| P4 | Door panel | 646×683 | 1 | 16; drill the handle holes once you have the handle |

When ordering:

- Ask for **cast** acrylic; it resists cracking better than extruded. The door panel can be solid PC instead.
- Polished edges, protective film left on.
- The supplier can drill the holes: **Ø6, 15 mm from the edge, no more than 175 mm apart** (5 holes per edge, corners shared).

### 3. Hardware

| # | Part | Spec | Qty | Use |
|---|---|---|---|---|
| H1 | Stainless butt hinge | 2 in (50 mm) | 3 | Door, left side, pin on the front-left outer corner |
| H2 | Countersunk wood screw | 3.5×30 | 20 | Hinges, through the side panel into the post |
| H3 | Pan-head wood screw | ST4×20 | 100 | Panels (80 holes plus spares) |
| H4 | Nylon flat washer | M4: 4.3×12×1 | 100 | 12 mm OD covers the Ø6 hole |
| H5 | Wood screw | 4×50 | 20 | 8 frame corners, 2 per corner |
| H6 | Wood screw | 4×60 | 30 | Posts and door corners: through 40 mm of wood with 20 mm of bite |
| H7 | Wood screw | 4×40 | 16 | Base → bottom frame, from below |
| H8 | L bracket | 40×40 with 4×16 screws | 8 | Inside each post-to-frame joint |
| H9 | Neodymium disc magnet | Ø10×3 N52 | 8 | 4 pairs, set into the front of the right post and the back of the door |
| H10 | Handle | 96 mm centres, M4×40 screws | 1 | Screws from counterbores on the back of the stile |
| H11 | Rubber foot | Ø30 | 4 | |
| H12 | Brush grommet | Ø50 | 2 | Back: power cable. Top: PTFE tube and cable |

### 4. Adhesives and seals

| # | Part | Spec | Qty | Use |
|---|---|---|---|---|
| G1 | Single-sided EVA foam tape | 3×10 mm | 20 m | Door seal about 2.5 m + panel gaskets about 13.5 m |
| G2 | Neutral-cure clear silicone | 300 ml + gun | 1 | Only for corner and bottom-edge gaps |
| G3 | PVA wood glue | Small bottle | 1 | All wood-to-wood joints |
| G4 | Two-part epoxy | 5-minute | 1 | For the magnets |

### 5. Optional

| # | Part | Spec | Qty | Use |
|---|---|---|---|---|
| O1 | 120 mm fan + guard | 5 V USB, speed control | 1 | Back panel, upper left; run it for PLA |
| O2 | Thermo-hygrometer | Digital | 1 | Above 35 °C inside, run the fan or open the door |
| O3 | Activated carbon filter | 120×120 | 1 | On the fan outlet |
| O4 | LED strip | 5 V, 1 m | 1 | Inside the top frame |

Compared with the original BOM: strips go from 4.8 m to about 10 m (bottom frame and door frame added); the M3×10 hinge bolts are no longer needed; the surface magnetic catches become flush magnets; handle, brackets, grommets, epoxy and silicone are new.

---

## 4. Mounting the panels and choosing glue

**Use screws with nylon washers to hold the panels and foam tape to seal them. Use glue only to fill gaps. Do not glue a panel flat onto the frame.** Acrylic and PC expand about 10× more than wood, so a glued panel warps or cracks at the glue line and the holes.

| Option | Verdict | How |
|---|---|---|
| Single-sided EVA foam tape, 3×10 | ✅ Use | Stick it on the outer faces of the frame as a gasket, press the panel on and fix with ST4×20 and nylon washers. Removable, sealed, and it absorbs expansion |
| Neutral-cure clear silicone | ✅ Use | Only for corner and bottom-edge gaps. It stays flexible and is safe on acrylic and PC |
| MS polymer adhesive / VHB foam tape | ⚠️ OK | Helps if you want fewer screws, but keep the screws at the corners and mid-edges |
| Cyanoacrylate (super glue) | ❌ Avoid | Fogs and stress-cracks acrylic and PC |
| Acetoxy (acid-cure) silicone | ❌ Avoid | Releases acetic acid as it cures, which crazes PC |
| Solvent contact cement | ❌ Avoid | The solvent etches the surface |
| Rigid epoxy over large areas | ❌ Avoid | Too stiff; cracks the panel as it expands (use it only for the magnets) |

Driving the screws: start at the middle hole of each edge and work outward. Stop when the washer seats, then back every screw off about a quarter turn so the panel can slide in its Ø6 holes.

---

## 5. Assembly order

The Assembly tab in the 3D model shows each step.

1. **Base:** fit a rubber foot at each corner under the 650×705 paulownia panel.
2. **Bottom frame:** make a rectangle from four 640 strips, front and back rails full width, side rails between them. Glue each corner and drive two 4×50 screws (pre-drill Ø2.5). Screw the frame to the base from below with 4×40.
3. **Posts:** stand the four 600 posts on the corners, 30 mm faces to the front and back. Drive 4×60 up through the frame into the post ends and add an L bracket on the inside.
4. **Top frame:** build it like the bottom frame, set it on the posts and screw down with 4×60. Before tightening, check that the diagonals differ by no more than 2 mm.
5. **Side and back panels:** run foam tape around the outer faces of the frame and fix the panels with ST4×20 and nylon washers. The back panel covers the rear edges of the side panels.
6. **Top panel:** fix it the same way, covering the top edges of the side and back panels. Fill the corner gaps with neutral-cure silicone.
7. **Door:** stiles full height, rails between them; glue, screw with 4×60 and check the diagonals. Fix the door panel to the front of the frame with ST4×20; it also keeps the frame square.
8. **Hinges, magnets, seal:** fit three butt hinges on the left so both leaves lie on the left side face when the door is closed (pin on the front-left outer corner; the door opens to about 180°). Drill four Ø10×3 pockets in the front of the right post and the back of the door and set the magnets in epoxy, checking polarity. Stick the seal on the front frame and fit the handle.
9. **Place the A1 and route cables:** centre the A1 with its front feet at least 90 mm from the inside of the front frame. Run the power cable through the back grommet. Keep the AMS lite outside on the right and bring its PTFE tube and cable in through the top grommet.

Tips:

- Paulownia is soft. Pre-drill Ø2.5 pilot holes for every wood screw and stop as soon as the parts pull tight. For a stiffer frame, make the posts from pine or fir in the same size.
- Drill acrylic with a step bit or an acrylic bit, at low speed, with scrap wood underneath and the film still on.
- Let each pair of magnets snap together first, then glue them one at a time so the polarity matches.

---

## 6. Files

| File | Contents |
|---|---|
| `docs/index.html` | Interactive three.js model, Chinese and English (parametric: frame width, depth, post height) |
| `bom.en.csv` / `bom.csv` | Final BOM in English / Chinese (default size 640×700×600) |

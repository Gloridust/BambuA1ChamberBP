# BambuA1ChamberBP · Wooden enclosure for the Bambu Lab A1

[中文](README.md) | **English**

A paulownia-strip frame with a flat wooden base, 3 mm clear panels on the other five sides and a hinged front door, built for the Bambu Lab A1 (not the mini).

- **Interactive 3D model:** [`docs/index.html`](docs/index.html). Open it in a browser, or point GitHub Pages at the `/docs` folder of the `main` branch. You can open the door, explode the model, step through the assembly and tap any part for its spec. Changing a frame size recalculates the BOM and the clearance checks. The page has a 中文 / EN switch.
- **Shopping list:** [`bom.en.csv`](bom.en.csv) (English) or [`bom.csv`](bom.csv) (Chinese). Both open in Excel or Numbers.
- **Timber machining drawings (PDF, 8 sheets, ready for the timber shop):** [English](docs/drawings/A1-enclosure-drawings-en.pdf) / [中文](docs/drawings/A1-enclosure-drawings-zh.pdf). External feed + rebate-and-bead version: cut list, profiles, part drawings, door frame, assembly views and panel holes, with the screw-on version as an appendix.

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
| 6 | **Surface magnetic catch** | The catch is thick enough to hold the door off the seal | **Ø12×3 countersunk magnets set into pockets** in the right post and the back of the door, held by a screw plus epoxy (see the end of section 4) |
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
| H9 | Countersunk neodymium magnet | Ø12×3 N52, M3 countersink, 4 N + 4 S | 8 | 4 pairs, set into the front of the right post and the back of the door |
| H14 | Countersunk wood screw (magnets) | 3×12 stainless | 8 | Drive until flush with the magnet |
| H10 | Handle | 96 mm centres, M4×40 screws | 1 | Screws from counterbores on the back of the stile |
| H11 | Rubber foot | Ø30 | 4 | |
| H12 | Brush grommet | Ø50 | 2 | Back: power cable. Top: PTFE tube and cable |

### 4. Adhesives and seals

| # | Part | Spec | Qty | Use |
|---|---|---|---|---|
| G1 | Single-sided EVA foam tape | 3×10 mm | 20 m | Door seal about 2.5 m + panel gaskets about 13.5 m |
| G2 | Neutral-cure clear silicone | 300 ml + gun | 1 | Only for corner and bottom-edge gaps |
| G3 | PVA wood glue | Small bottle | 1 | All wood-to-wood joints |
| G4 | Two-part epoxy | 5-minute | 1 | A dab in each magnet pocket and screw hole |

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

### Panel mounting: screwed on / rebate + bead

The clear panels are **not glued to the surface** in either version. Both hold them mechanically; glue only fills gaps. Switch between them on the Controls tab of the 3D model.

| | Screwed on (default) | Rebate + bead (recommended, better finish) |
|---|---|---|
| How | Panel lies on the outer face of the frame, fixed through Ø6 holes with ST4×20 screws and nylon washers over 3 mm foam tape | A 10 × 4 mm rebate along the inner edge of each opening; the panel sits in it flush with the frame, held by 20×5 wooden beads screwed into the wood |
| Holes in panels | Yes, 16 per panel | None, so nothing can crack at a hole |
| Room to expand | Ø6 holes give each screw ±1 mm | 2 mm gap all round; the panel moves freely |
| Tools | Drill | Router with a rebate bit, or have the timber shop cut the rebates |
| Replacing a panel | Unscrew it | Remove the beads |
| Look | Panel edges exposed | Panel flush with the frame, edges hidden by beads |

**Where the rebates go** (always the edge facing the opening, 10 wide × 4 deep):

| Part | Face with the rebate |
|---|---|
| A Post | Side face (side panel); back posts also the back face (back panel) |
| B Front/back rail | Bottom back rail: top edge of the outer face. Top back rail: bottom edge of the outer face. Top front and back rails: inner edge of the top face (top panel) |
| C Side rail | Bottom side rails: top edge of the outer face. Top side rails: bottom edge of the outer face + inner edge of the top face |
| D / E Door frame | Inner edge of the front face |

**BOM changes for the rebate version** (frame 640×700, posts 600):

| # | Part | Change to | Qty |
|---|---|---|---|
| D | Door stile | 30×40×**680** | 2 |
| E | Door rail | 30×40×**560** | 2 |
| G | Glazing bead (new) | Solid wood 20×5, about 12.4 m in total (buy 7 × 2 m) | |
| P1 | Side panel | **636×616**, no screw holes | 2 |
| P2 | Back panel | **596×616**, Ø50 grommet hole only | 1 |
| P3 | Top panel | **596×656**, Ø50 grommet hole only | 1 |
| P4 | Door panel | **576×616**, no holes | 1 |
| H2 | Hinge screws | 3.5×**25** (straight into the post) | 20 |
| H3 | Bead screws | Countersunk wood screw **3×16**, about 106, buy 120 | 120 |
| H4 | Nylon washers | Not needed | 0 |
| G1 | Door seal foam | 3×10, door seal only | 5 m |
| G5 | Rebate bedding foam (new) | Single-sided EVA **1×8 mm** on the rebate floor | 15 m |

The door becomes as wide as the frame (640) because the side panels no longer stand proud of it. Finished size about 650 × 743 (with door) × 710 mm.

### Mounting the door magnets

Don't just glue magnets onto the wood surface. Paulownia is soft, and every time the door opens it pulls on the magnets, so a glued surface joint eventually lets go. Set them in pockets and use a screw plus glue:

1. **Buy countersunk magnets:** Ø12×3 N52 with an M3 countersunk hole. The countersink fixes the pole on each magnet, so buy N/S pairs: 4 with N facing out and 4 with S facing out.
2. **Bore flat-bottom pockets:** with a Ø12 Forstner bit, bore four pockets **2.5 mm deep** in the front of the right post and four in the back of the right door stile, lined up with each other. Bore the post first, put a dab of paint in each pocket and close the door to mark the matching spots.
3. **Fix them:** put a dab of epoxy in the pocket, seat the magnet and drive a 3×12 stainless countersunk wood screw until it is flush. Overtightening cracks the magnet. Use N-facing magnets on the post and S-facing ones on the door.
4. **Why 2.5 mm deep:** each 3 mm magnet stands 0.5 mm proud, 1 mm for the pair. The 3 mm door seal compresses to about 1.5 mm, so the magnets never touch, but they are close enough to hold the door against the seal.

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
8. **Hinges, magnets, seal:** fit three butt hinges on the left so both leaves lie on the left side face when the door is closed (pin on the front-left outer corner; the door opens to about 180°). Fit four magnets in the front of the right post and the back of the door; see the end of section 4. Stick the seal on the front frame and fit the handle.
9. **Place the A1 and route cables:** centre the A1 with its front feet at least 90 mm from the inside of the front frame. Run the power cable through the back grommet. Keep the AMS lite outside on the right and bring its PTFE tube and cable in through the top grommet.

Tips:

- Paulownia is soft. Pre-drill Ø2.5 pilot holes for every wood screw and stop as soon as the parts pull tight. For a stiffer frame, make the posts from pine or fir in the same size.
- Drill acrylic with a step bit or an acrylic bit, at low speed, with scrap wood underneath and the film still on.

---

## 6. Files

| File | Contents |
|---|---|
| `docs/index.html` | Interactive three.js model, Chinese and English (parametric: frame width, depth, post height) |
| `bom.en.csv` / `bom.csv` | Final BOM in English / Chinese (default size 640×700×600) |
| `docs/drawings/*.pdf` | Timber machining drawings, English / Chinese |
| `drawings/build.js` | Drawing generator: `node drawings/build.js` (needs Playwright + Chromium) |

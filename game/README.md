# Gate Commander

A playable **crowd runner** — the genre behind those viral "+50 / ×3 / 470"
mobile ads — built so that the game actually *is* the advertisement, and so the
mechanics underneath it are worth playing.

Open `game/index.html` in any browser. No build step, no dependencies, no
network. One file, one `<canvas>`.

```
open game/index.html          # macOS
xdg-open game/index.html      # Linux
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Steer the squad | drag, or `A` / `D` / arrows | drag anywhere |
| Focus Fire (hold) | hold `Space` or hold mouse on FOCUS | hold the FOCUS button |
| Pick a doctrine | `1` `2` `3` or click | tap |
| Pause / restart | `P` / `R` | pause button |

## Why the ads look nothing like the games

The screenshot format is a **gate runner**: a crowd of units sprints down a
causeway, the player steers left/right, arch gates apply `+N` / `×N` to the
crowd, numbered barrels soak damage, and an enemy army waits at the end.
*Count Masters*, *Join Clash 3D* and *Crowd City* are the honest versions;
*Last War: Survival* is the famous dishonest one, where the advertised lane
minigame is a sliver of a 4X base-builder.

The reason the real games are shallow is that the ad only has to survive three
seconds. Nothing in a `+50` vs `×3` choice is a decision — you take the bigger
number. This build keeps the look and puts a real decision under every beat.

## What makes it a game

**Composition, not just headcount.** Five unit classes with different damage,
durability and range. The formation auto-sorts by role, so what you see is what
you get:

| Class | Role | Damage | Soak | Notes |
| --- | --- | --- | --- | --- |
| Guard | front rank | very low | 4× | eats incoming fire before anyone else |
| Zealot | second rank | highest | 0.5× | takes double damage |
| Rifle | body | baseline | 1× | the default recruit |
| Rocket | rear | high | 1× | splash |
| Sniper | rear | high | 1× | out-ranges everything |

Incoming damage is consumed front-to-back, so a wall of Guards is literally the
thing standing between fire and your snipers. A class gate is a decision about
the *shape* of the squad, not its size.

**Straddling.** Gates come in pairs either side of a divider. Commit to one arch
and you get 100% of its effect. Keep the crowd spread across both and you take
**60% of each** — the way to grab a `×3` while diluting the curse attached to
it, or to blend two class gates into a mixed formation. It also pays `+2` chain
and extra Command, so it is the high-skill line rather than a safety valve.

**Cursed gates.** `×3 ALL ZEALOT` doubles your army and makes it made of glass.
`+50 / −35% NOW` is a loan. These are genuine trades, and the *Requisition*
doctrine changes how you price them.

**Focus Fire.** Your squad auto-fires; that part is the fantasy. The active
layer is Command: hold FOCUS to converge every barrel on one target for ×2.7
damage. It is the only thing that breaks a boss shield, and it is the answer to
a turret that is chewing through your front rank. Command regenerates slowly and
pays out on gates and kills, so using it is a tempo decision.

**Chain.** Gates taken and obstacles destroyed build a chain; losing a single
unit breaks it. It scales score, Command income, and — with the *Momentum*
doctrine — damage. This is what makes dodging mines matter even when you have
300 units and could afford the losses.

**Attrition, not DPS checks.** Mines, artillery blast zones and cursed gates
remove units regardless of how big your army is. The difficulty curve is about
protecting a formation, not out-scaling a health bar.

**Doctrines.** Every sector ends in a draft: 1 of 3 run-long perks from a pool
of 14, all of which change how you value gates. *Vanguard Doctrine* makes Guard
gates a priority; *Fanatics* removes the Zealot drawback and makes cursed gates
strictly good; *Field Medic* rewards taking many small gates over one big one.

**Bosses.** Every third sector a warmachine holds station ahead of you. Its
shield only yields to Focus Fire, it drops telegraphed artillery you have to
steer the crowd around, and it spawns adds while you do it.

## How it is built

No engine and no assets. `game/index.html` contains everything.

- **Renderer.** A pinhole camera with a fixed downward pitch, projecting world
  `(x, y, z)` to screen with the painter's algorithm. The ground is drawn as
  ~35 depth-sorted quads per frame, which gives perspective-correct banding for
  free; everything else is a depth-sorted billboard.
- **Soldiers.** Pre-rendered once per class into offscreen canvases (two run
  frames each), then blitted. That is what keeps 300+ units at 60fps in 2D.
- **Damage.** Aggregate: the squad's total DPS is applied continuously to one
  target. Tracers and muzzle flashes are pure decoration on top, rate-limited to
  ~35/sec, so unit count never costs frame time.
- **Audio.** A ~40-line Web Audio synth. No files.

## Balance knobs

Everything worth tuning is in the `CFG` object and the `KIND` / `PERKS` tables
at the top of the script.

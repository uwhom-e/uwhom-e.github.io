---
title: "Pivot to Bimanual Manipulation"
date: 2026-10-05
summary: "The project moves from a Martian lava-tube swarm to a pair of single-arm mobile robots that coordinate as one bimanual system."
tags: ["planning", "proposal"]
---

## Overview

The team has pivoted away from the Martian Habitat project. The new direction asks: **what does manipulation gain when the two arms sit on independent mobile bases instead of a shared torso, and what does that freedom cost in coordination?**

Two-armed robots today mount both arms on one body, which fixes the spacing between them. Two identical single-arm mobile robots can reach beyond one body's span, be on both sides of an obstacle at once, and each work alone on simple tasks. The cost is that the robots must locate each other with their own sensors and coordinate without a rigid link.

**Claim:** two single-arm mobile robots, coordinated as one system, can complete tasks that a fixed-spacing two-arm arrangement of the same arms cannot.

**Not claimed:** a general home assistant, better performance than a humanoid, or swarm behaviour.

#### Scope
- Each robot is a self-contained arm on a mobile base (~0.5 m reach, ~0.5 kg payload) with onboard cameras, its own power, and identical hardware and software so any robot can fill any role
- Pose estimation from onboard sensing only — no motion capture or external tracking
- Robots carry out simple tasks alone, team up on tasks that need two, and decide which is which
- Out of scope: learning from human video, voice control, scaling beyond two robots

#### Sub-problems
1. **Coordinate:** time a handover, hold while the other acts, or move while both grip the same object
2. **React:** stop or replan safely around people and objects crossing a planned trajectory
3. **Localize:** given a map and the onboard sensor suite, work out where each robot is and navigate

#### Criteria
| Criterion | Objective (should) | Constraint (must) |
| :--- | :--- | :--- |
| Operational space | > 2.6 m | > 2× reach + 0.42 m (upper end of human shoulder width) |
| Task success rate | 95% over 20 trials on each chosen task | 60% on at least one task that needs two robots |
| Completion time | No slower than the fixed-spacing baseline on tasks both can do | N/A |
| Versatility | 3 task classes | 1 task class |
| Object detection | 51 mm hole / gap from 2× reach away within FOV | 70 mm × 400 mm cylinder (horizontal / vertical) from 2× reach away within FOV |
| Response time | N/A | T<sub>stop</sub> = 2× reach / (base speed [m/s] + 1.4 m/s) |
| Response action | Plan around | Stop |
| Sensor modality | N/A | No motion capture or external sensing |
| Payload per arm at full reach | 0.5 kg | At least 0.3 kg |
| Arm reach | 0.5 m | At least 0.4 m |
| Working height | Cover 0.3 m to 0.8 m | Reach a 0.45 m surface |
| Untethered runtime | 30 minutes | At least 15 minutes |

#### Demonstration tasks
| Task | Concrete version | Priority |
| :--- | :--- | :--- |
| Co-carry | Both robots carry a long, light object (cardboard tube or foam board) through a doorway | #1 |
| Hold, act and move | One robot holds a measuring tape while the other measures a box, with at least one base moving | #2 |
| Pass across a gap | Hand a small item across a gap wider than one arm's reach, such as over a table | #3 |

## What we did

- Reviewed the gap between two-arm (shared body) manipulation research and multi-robot transport research
- Drafted the new proposal: thesis, scope, criteria and constraints, and demonstration tasks
- Surveyed related patents and low-cost hardware (SO-101 arm, LeKiwi base, XLeRobot as a fixed-spacing comparison point)

## Next steps

- Settle the three decision bundles: **architecture** (coordination, control scheme, allocation, main result), **perception** (mobile base, localization), and **physical** (arm actuation, mobile base)

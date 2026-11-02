---
title: "Design & Architecture Research"
date: 2026-10-15
summary: "Mechanical trade studies and preliminary software architecture research for independent mobile manipulators."
tags: ["design", "research", "software"]
---

## Overview

With the scope set, the team worked through the major design decisions for the PDP, running each through a decision matrix: options that fail a requirement are cut, the rest are scored 0 (at the limit) to 5 (at the target) on weighted criteria, and each result is checked for how much a weight would have to change to flip it.

## What we did

#### Camron
- Set the mechanical requirements every option must meet: 0.3 kg payload while the arm and base move, at least 0.3 m/s loaded tip speed, 10 N side force at the tip with 2.5 m/s² base acceleration, and at least 80 °C heat deflection for parts touching a servo
- Swept link lengths, actuators, materials and base geometry, in that order, with each choice feeding the next

**Link lengths: 0.50 m upper arm, 0.26 m forearm.** Swept five combinations against reaching floor to 0.8 m at 0.5 m out. 0.50 / 0.26 is the only one that also keeps 0.3 m/s at the tip, so no weighting changes the result.

**Actuators: STS3215 on every joint, with single-stage cycloidal gearboxes.** The HLS3960 is faster, stronger and supports force control, but costs about four times as much. The STS3215 stays ahead unless cost drops below 54% of the weighting.

| Option | Cost (6 servos) | Payload | Tip speed | Score |
| :--- | :---: | :---: | :---: | :---: |
| **STS3215** | $168 | 0.46 kg | 0.30 m/s | **3.60** |
| HLS3960 | $696 | 0.81 kg | 0.99 m/s | 3.22 |

**Materials: PAHT-CF gearboxes, PPA-CF links.** Both were scored on the earlier, heavier HLS3960 sizing. PETG is out for both because it softens below the 80 °C requirement for parts bolted to a servo.

For the printed planetary gearboxes, PAHT-CF absorbs about half the water of PA6, so the teeth keep their strength through the term. PA6-GF is tougher and the fallback.

| Gearbox material | Heat deflection | Water uptake | Cost / robot | Score |
| :--- | :---: | :---: | :---: | :---: |
| PA6-GF | 158 °C | 2.6% | $23 | 3.13 |
| PA6-CF | 164 °C | 2.4% | $27 | 2.86 |
| **PAHT-CF** | 170 °C | 1.2% | $31 | **3.59** |
| PETG HF | Fails (69 °C) | 0.3% | $13 | — |

For the links (40 × 40 × 2.5 mm printed box), both carbon-fibre materials clear the heat requirement easily, so it came down to stiffness against cost. PPA-CF bends less but costs more. PET-CF is cheaper and easier to print, and is the fallback. Bending is small next to the roughly 20 mm of gearbox backlash at the tip either way.

| Link material | Heat deflection | Tip bending | Cost / robot | Score |
| :--- | :---: | :---: | :---: | :---: |
| PETG HF | Fails (69 °C) | 9.8 mm | $10 | — |
| PET-CF | 182 °C | 3.8 mm | $45 | 3.29 |
| **PPA-CF** | 227 °C | 2.1 mm | $99 | **3.51** |

**Base: 4-wheel X omni, 0.20 m radius.** Each base needs enough ballast to resist tipping under the side-force and acceleration requirements. The 4-wheel X at 0.20 m is the lightest option that passes and fits the 0.40 m footprint target.

| Option | Ballast needed | Robot mass | Score |
| :--- | :---: | :---: | :---: |
| Kiwi, r 0.15 m | Fails | — | — |
| Kiwi, r 0.20 m | 5.4 kg | 12.5 kg | 3.96 |
| 4-wheel X, r 0.15 m | 4.0 kg | 11.7 kg | 4.29 |
| **4-wheel X, r 0.20 m** | 1.0 kg | 8.7 kg | **5.00** |

The resulting build carries 0.46 kg while moving (against a 0.3 kg minimum) at 0.3 m/s loaded tip speed, for $168 in servos per robot.

#### Karthigan

##### Software Research & Preliminary Architecture

**Narrowed the software research scope with Tong and Ethan.** Karthigan, Tong and Ethan focused the software investigation on how independent mobile manipulators could plan, coordinate and execute cooperative tasks. The discussions organized the research around task decomposition, reusable manipulation skills, execution feedback and coordination between the robots, giving the team a more focused set of architecture questions to investigate.

**Formulated preliminary architecture documents.** Outlined general approaches for connecting high-level planning, perception, task execution and local robot control. The early documents compared possible planning and coordination structures, described how the major components could exchange task and state information, and recorded open questions for further research. These preliminary directions provided a basis for the later architecture proposals and task-graph experiments.

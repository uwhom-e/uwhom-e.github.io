---
title: "Domain Research & Design Brainstorm"
date: 2026-09-27
summary: "Split research across problem domains, then regrouped to brainstorm designs and identify the key sub-problems."
tags: ["planning", "research", "design"]
---

## Overview

With the Martian Habitat project locked in, the next step was to understand the solution space before committing to a design. Across two meetings (Sept 22 and Sept 27), the team broke the problem into domains, researched them individually, then came back together to brainstorm designs and map out the key sub-problems.

#### Research Angles (Sept 22)
We revisited Earth vs. Mars as the target environment and decided to **stick with Mars**. Martian gravity can be (roughly) simulated, and other factors like temperature can be neglected for now. Since simulation will be a large part of the project, we also agreed to research sim tooling early so it doesn't become a blocker later.

Research was split hierarchically by domain:

| Domain | Owner(s) |
| :--- | :--- |
| Swarm dynamics (everyone contributes) | Karthi, Tong |
| &nbsp;&nbsp;Mapping | Tong |
| &nbsp;&nbsp;Cooperative transport | Karthi |
| &nbsp;&nbsp;Virtual stigmergy | Tong |
| Sensing | Ethan |
| Locomotion / manipulation | David, Camron |

#### Brainstorm Session (Sept 27)
Each member brought their findings to a working session where we mapped ideas and subsystems together on a shared Excalidraw board.

![Excalidraw board mapping ideas and subsystems from the design brainstorm](./2026-09-27-brainstorm.png)

**Mapping.** Decentralized SLAM (DSLAM) looks promising: agents merge their map graphs once they confirm neighbours have observed the same features. This requires transmitting maps between agents, so compute, bandwidth, and general networking all need a closer look. Most SLAM literature focuses on mapping over exploration, so *Simultaneous Localization and Exploration* work is worth digging into. Beacon robots that relay information are also an option, at the cost of centralizing some of the work.

**Stigmergy.** There's no great way to do true physical stigmergy (think pheromone trails). Signalling through debris movement is one idea, but realistically the robots will need some form of **local communication** to coordinate.

**Cooperative transport.** Collective transport itself isn't the hard part. The main open problem is *where to make contact* with an object, and most research points to mapping the object first. Once attachment points are chosen, each robot can use force feedback to move toward an optimal position. Larger boulders need more help, so recruiting robots (peer-to-peer or via beacons) and coordinating separate "fleets" to avoid collisions are both needed.

**Locomotion & grasping.** Options for uneven cave terrain included:
- Wheels
- Legs: handle rough terrain well and can brace against walls for more strength-to-weight, but risk tangling
- Deployable wheels: compact for transport, expand once deployed; durable and forgiving of poor mapping
- Jumping
- Hybrid suspension: strong on terrain and inclines, absorbs load

For manipulation, pushing is easy and lifting is hard. Microspine grippers are attractive but difficult to manufacture.

**Sensing.** The likely localization stack is **4D radar + IMU + ToF LiDAR** (similar to Waymo's setup). LiDAR is sensitive to dust while radar holds up better and gives velocity directly via the Doppler effect, which opens the door to Doppler SLAM. FMCW LiDARs that send chirp signals for velocity measurement exist but are expensive.

#### Key Sub-problems
- Inter-agent communication and networking (shared across mapping, stigmergy, and transport)
- Decentralized mapping and exploration of the lava tube
- Contact-point selection and coordination for cooperative transport
- Locomotion over uneven, dusty terrain
- Robust localization sensing in a dusty environment
- A simulation environment that approximates Martian conditions

#### Design Concepts
The session produced four candidate concepts to develop further:
1. **Shoveller**
2. **Pusher**
3. **Wedges**
4. **Scout and worker**

## What we did

- Chose Mars over Earth as the target environment
- Split research by domain and researched individually
- Brainstormed subsystems and designs together on a shared Excalidraw board
- Identified key sub-problems and landed on four design concepts

## Next steps

- Flesh out the four design concepts and evaluate them against each other
- Research simulation tooling for Martian conditions
- Investigate communication, bandwidth, and compute requirements for multi-agent coordination
